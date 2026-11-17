
import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
    createApiKeyLookupHash,
    verifyApiKey,
} from "@/lib/api-key";
import { consumeApiKeyToken } from "@/lib/rate-limit";
import { consumeMonthlyQuota } from "@/lib/monthly-quota";
import { createRequestLogger } from "@/lib/request-logger";

const eventSchema = z.object({
    eventName: z.string().trim().min(1).max(100),
    distinctId: z.string().trim().min(1).max(255),
    occurredAt: z.coerce.date().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
});

const requestSchema = z.union([
    eventSchema,
    z.object({
        events: z.array(eventSchema).min(1).max(500),
    }),
]);

const createResponse = (
    body: object,
    status: number,
    headers: Record<string, string> = {},
    requestId?: string
) =>
    NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
            ...(requestId ? { "X-Request-Id": requestId } : {}),
            ...headers,
        },
    });

type IngestionResult = {
    status: number;
    body: object;
    headers: Record<string, string>;
};

export const POST = async (request: Request) => {
    const { requestId, log } = createRequestLogger(request)

    const respond = (
        body: object,
        status: number,
        headers: Record<string, string> = {}
    ) => createResponse(body, status, headers, requestId)

    const authorization = request.headers.get("authorization");

    const apiKey = authorization?.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";

    if (!/^atlas_[a-f0-9]{64}$/i.test(apiKey)) {
        return respond(
            { message: "A valid API key is required." },
            401,
        );
    }

    const idempotencyKey = request.headers
        .get("Idempotency-Key")
        ?.trim();

    if (!idempotencyKey || idempotencyKey.length > 255) {
        return respond(
            {
                message:
                    "A valid Idempotency-Key header is required (1–255 characters).",
            },
            400,
        );
    }

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return respond({ message: "Invalid JSON body." }, 400);
    }

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
        return respond(
            {
                message:
                    "Invalid event data. Send one event or 1–500 events.",
            },
            400,
        );
    }

    const events = "events" in parsed.data
        ? parsed.data.events
        : [parsed.data];

    const lookupHash = createApiKeyLookupHash(apiKey);

    const idempotencyKeyHash = createHash("sha256")
        .update(idempotencyKey, "utf8")
        .digest("hex");

    try {
        // Step 1: Fetch API key details in a short transaction.
        const storedKey = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`
        SELECT set_config(
          'app.api_key_hash',
          ${lookupHash},
          true
        )
      `;

            return tx.apiKey.findUnique({
                where: { keyLookupHash: lookupHash },
                select: {
                    id: true,
                    tenantId: true,
                    keyHash: true,
                },
            });
        });

        if (!storedKey) {
            return respond(
                { message: "Invalid or revoked API key." },
                401,
            );
        }

        // Step 2: Verify expensive scrypt hash outside the transaction.
        const isValidKey = await verifyApiKey(
            apiKey,
            storedKey.keyHash,
        );

        if (!isValidKey) {
            return respond(
                { message: "Invalid or revoked API key." },
                401,
            );
        }

        // Step 3: Perform database operations in a second transaction.
        const result = await prisma.$transaction(
            async (tx): Promise<IngestionResult> => {
                await tx.$queryRaw`
          SELECT set_config(
            'app.api_key_hash',
            ${lookupHash},
            true
          )
        `;

                // Recheck the API key to detect revocation.
                const currentKey = await tx.apiKey.findUnique({
                    where: { keyLookupHash: lookupHash },
                    select: {
                        id: true,
                        tenantId: true,
                        revokedAt: true,
                    },
                });

                if (
                    !currentKey ||
                    currentKey.id !== storedKey.id ||
                    currentKey.revokedAt
                ) {
                    return {
                        status: 401,
                        body: { message: "Invalid or revoked API key." },
                        headers: {},
                    };
                }

                await tx.$queryRaw`
          SELECT set_config(
            'app.tenant_id',
            ${currentKey.tenantId},
            true
          )
        `;

                const tenant = await tx.tenant.findUnique({
                    where: { id: currentKey.tenantId },
                    select: { suspendedAt: true },
                });

                if (!tenant || tenant.suspendedAt) {
                    return {
                        status: 403,
                        body: { message: "Organization is unavailable." },
                        headers: {},
                    };
                }

                const now = new Date();

                // Remove an expired idempotency record for this key.
                await tx.eventIngestionRequest.deleteMany({
                    where: {
                        tenantId: currentKey.tenantId,
                        idempotencyKeyHash,
                        expiresAt: { lte: now },
                    },
                });

                // Return early if this idempotency key was already processed.
                const existingRequest = await tx.eventIngestionRequest.findUnique({
                    where: {
                        tenantId_idempotencyKeyHash: {
                            tenantId: currentKey.tenantId,
                            idempotencyKeyHash,
                        },
                    },
                });

                if (existingRequest) {
                    return {
                        status: 202,
                        body: {
                            status: 202,
                            accepted: 0,
                            duplicate: true,
                        },
                        headers: {},
                    };
                }

                // Check rate limit before reserving the idempotency key.
                const rateLimit = await consumeApiKeyToken(
                    tx as unknown as Prisma.TransactionClient,
                    currentKey.id,
                );

                if (!rateLimit.allowed) {
                    return {
                        status: 429,
                        body: {
                            message: "Rate limit exceeded. Try again later.",
                        },
                        headers: {
                            "Retry-After": String(rateLimit.retryAfterSeconds),
                        },
                    };
                }

                // Check and consume the tenant's monthly event quota.
                const quota = await consumeMonthlyQuota(
                    tx as unknown as Prisma.TransactionClient,
                    currentKey.tenantId,
                    events.length,
                );

                if (!quota.allowed) {
                    const resetAt = new Date(
                        Date.UTC(
                            quota.monthStart.getUTCFullYear(),
                            quota.monthStart.getUTCMonth() + 1,
                            1,
                        ),
                    );

                    return {
                        status: 429,
                        body: {
                            error: {
                                code: "MONTHLY_EVENT_QUOTA_EXCEEDED",
                                message: "Monthly event quota exceeded.",
                            },
                            quota: {
                                limit: quota.limit,
                                used: quota.used,
                                requested: events.length,
                                remaining: quota.remaining,
                                resetAt: resetAt.toISOString(),
                            },
                        },
                        headers: {},
                    };
                }

                // Reserve the idempotency key.
                await tx.eventIngestionRequest.create({
                    data: {
                        tenantId: currentKey.tenantId,
                        idempotencyKeyHash,
                        expiresAt: new Date(
                            now.getTime() + 24 * 60 * 60 * 1000,
                        ),
                    },
                });

                await tx.apiKey.update({
                    where: { id: currentKey.id },
                    data: { lastUsedAt: now },
                });

                await tx.event.createMany({
                    data: events.map((event) => ({
                        tenantId: currentKey.tenantId,
                        apiKeyId: currentKey.id,
                        eventName: event.eventName,
                        distinctId: event.distinctId,
                        occurredAt: event.occurredAt ?? now,
                        properties: (event.properties ?? {}) as Prisma.InputJsonValue,
                    })),
                });

                return {
                    status: 202,
                    body: {
                        status: 202,
                        accepted: events.length,
                        duplicate: false,
                    },
                    headers: {},
                };
            },
        );

        return respond(
            result.body,
            result.status,
            result.headers,
        );
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return respond(
                { status: 202, accepted: 0, duplicate: true },
                202,
            );
        }

        log("error", "event_ingestion_failed", {
            error: error instanceof Error ? error.message : String(error),
        });

        return respond(
            { message: "Could not accept events." },
            500,
        );
    }
};
