
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createRequestLogger } from "@/lib/request-logger";

const paramsSchema = z.object({
    id: z.string().trim().min(1).max(128),
});

type RouteContext = {
    params: Promise<{ id: string }>;
};

export const PATCH = async (
    request: Request,
    context: RouteContext,
) => {
    const { requestId, log } = createRequestLogger(request);

    const respond = (body: unknown, status = 200) =>
        NextResponse.json(body, {
            status,
            headers: {
                "Cache-Control": "no-store",
                "X-Request-Id": requestId,
            },
        });

    log("info", "api_key_revocation_requested");

    try {
        const params = await context.params;
        const parsedParams = paramsSchema.safeParse(params);

        if (!parsedParams.success) {
            log("warn", "api_key_revocation_invalid_id");

            return respond(
                { message: "Invalid API key ID." },
                400,
            );
        }

        const { id } = parsedParams.data;

        const session = await auth();
        const userId = session?.user?.id;
        const tenantId = session?.user?.activeTenantId;

        if (!userId) {
            log("warn", "api_key_revocation_unauthorized");

            return respond(
                { message: "Please log in first." },
                401,
            );
        }

        if (!tenantId) {
            log("warn", "api_key_revocation_missing_active_tenant", {
                userId,
            });

            return respond(
                { message: "Please select an active organization." },
                409,
            );
        }

        const result = await prisma.$withTenant(
            userId,
            tenantId,
            async (tx) => {
                const membership = await tx.membership.findUnique({
                    where: {
                        userId_tenantId: {
                            userId,
                            tenantId,
                        },
                    },
                    select: { role: true },
                });

                if (
                    membership?.role !== "OWNER" &&
                    membership?.role !== "ADMIN"
                ) {
                    return {
                        status: 403,
                        message: membership
                            ? "Only owners and admins can revoke API keys."
                            : "You do not have access to this organization.",
                    } as const;
                }

                const apiKey = await tx.apiKey.findFirst({
                    where: {
                        id,
                        tenantId,
                    },
                    select: {
                        id: true,
                        revokedAt: true,
                    },
                });

                if (!apiKey) {
                    return {
                        status: 404,
                        message: "API key not found.",
                    } as const;
                }

                if (apiKey.revokedAt) {
                    return {
                        status: 409,
                        message: "API key is already revoked.",
                    } as const;
                }

                const updated = await tx.apiKey.updateMany({
                    where: {
                        id: apiKey.id,
                        tenantId,
                        revokedAt: null,
                    },
                    data: {
                        revokedAt: new Date(),
                    },
                });

                if (updated.count !== 1) {
                    return {
                        status: 409,
                        message: "API key could not be revoked.",
                    } as const;
                }

                return {
                    status: 200,
                    message: "API key revoked successfully.",
                } as const;
            },
        );

        if (result.status === 200) {
            log("info", "api_key_revoked", {
                userId,
                tenantId,
                apiKeyId: id,
            });
        } else {
            log("warn", "api_key_revocation_not_completed", {
                userId,
                tenantId,
                apiKeyId: id,
                status: result.status,
            });
        }

        return respond(
            { message: result.message },
            result.status,
        );
    } catch (error) {
        log("error", "api_key_revocation_failed", {
            error: error instanceof Error
                ? error.message
                : String(error),
        });

        return respond(
            { message: "Could not revoke the API key." },
            500,
        );
    }
};
