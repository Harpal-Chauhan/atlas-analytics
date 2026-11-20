
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PrismaClient } from "../src/generated/prisma/client";
import {
    createApiKey,
    createApiKeyLookupHash,
    hashApiKey,
} from "../src/lib/api-key";
import { POST } from "../src/app/api/v1/events/route";
import { subscribeToTenantEvents } from "../src/lib/postgres-listener";

const databaseUrl = process.env.DATABASE_URL;
const appDatabaseUrl = process.env.APP_DATABASE_URL;

if (!databaseUrl || !appDatabaseUrl) {
    throw new Error(
        "DATABASE_URL and APP_DATABASE_URL must be configured in .env",
    );
}

const adminDb = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
});

const appDb = new PrismaClient({
    datasources: { db: { url: appDatabaseUrl } },
});

const createTestContext = async () => {
    const suffix = randomUUID();

    const user = await adminDb.user.create({
        data: {
            name: "Ingestion Test User",
            email: `ingestion-${suffix}@example.com`,
        },
    });

    try {
        const tenant = await adminDb.tenant.create({
            data: {
                name: "Ingestion Test Tenant",
                slug: `ingestion-${suffix}`,
            },
        });

        const apiKey = createApiKey();

        const key = await adminDb.apiKey.create({
            data: {
                tenantId: tenant.id,
                createdById: user.id,
                name: "Ingestion Test Key",
                keyHash: await hashApiKey(apiKey),
                keyLookupHash: createApiKeyLookupHash(apiKey),
            },
        });

        return {
            userId: user.id,
            tenantId: tenant.id,
            apiKeyId: key.id,
            apiKey,
        };
    } catch (error) {
        await adminDb.user.deleteMany({
            where: { id: user.id },
        });

        throw error;
    }
};

const cleanupTestContext = async (
    context: Awaited<ReturnType<typeof createTestContext>>,
) => {
    await adminDb.tenant.deleteMany({
        where: { id: context.tenantId },
    });

    await adminDb.user.deleteMany({
        where: { id: context.userId },
    });
};

const sendEventRequest = async (
    apiKey: string,
    idempotencyKey: string,
    payload: unknown,
) => {
    const request = new NextRequest(
        "http://localhost/api/v1/events",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Idempotency-Key": idempotencyKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        },
    );

    return POST(request);
};

const createEventPayload = (eventName: string) => ({
    eventName,
    distinctId: "integration-test-user",
    properties: {
        source: "vitest",
        test: true,
    },
});

afterAll(async () => {
    await appDb.$disconnect();
    await adminDb.$disconnect();
});

describe("Event ingestion API integration", () => {

    it("accepts a valid event and stores it", async () => {
        const context = await createTestContext();
        const eventName = `integration_event_${randomUUID()}`;

        try {
            const response = await sendEventRequest(
                context.apiKey,
                `ingestion-${randomUUID()}`,
                createEventPayload(eventName),
            );

            expect(response.status).toBe(202);

            const eventCount = await adminDb.event.count({
                where: {
                    tenantId: context.tenantId,
                    eventName,
                },
            });

            expect(eventCount).toBe(1);
        } finally {
            await cleanupTestContext(context);
        }
    }, 30000);

    it("does not insert duplicate events for the same idempotency key", async () => {
        const context = await createTestContext();
        const eventName = `idempotency_event_${randomUUID()}`;
        const idempotencyKey = `duplicate-${randomUUID()}`;
        const payload = createEventPayload(eventName);

        try {
            const firstResponse = await sendEventRequest(
                context.apiKey,
                idempotencyKey,
                payload,
            );

            const secondResponse = await sendEventRequest(
                context.apiKey,
                idempotencyKey,
                payload,
            );

            expect(firstResponse.status).toBe(202);
            expect(secondResponse.status).toBe(202);

            const eventCount = await adminDb.event.count({
                where: {
                    tenantId: context.tenantId,
                    eventName,
                },
            });

            expect(eventCount).toBe(1);
        } finally {
            await cleanupTestContext(context);
        }
    }, 30000);

    it("delivers live notifications only to the matching tenant", async () => {
        const tenantA = await createTestContext();
        const tenantB = await createTestContext();

        const eventName = `live_event_${randomUUID()}`;

        let unsubscribeA: (() => void) | null = null;
        let unsubscribeB: (() => void) | null = null;
        let tenantBReceivedNotification = false;

        let resolveNotification!: (event: {
            tenantId: string;
            eventCount: number;
            latestEventAt: string;
            eventNames: string[];
        }) => void;

        const notificationPromise = new Promise<{
            tenantId: string;
            eventCount: number;
            latestEventAt: string;
            eventNames: string[];
        }>((resolve) => {
            resolveNotification = resolve;
        });

        let timeout: ReturnType<typeof setTimeout> | undefined;

        try {
            unsubscribeA = await subscribeToTenantEvents(
                tenantA.tenantId,
                (event) => {
                    resolveNotification(event);
                },
            );

            unsubscribeB = await subscribeToTenantEvents(
                tenantB.tenantId,
                () => {
                    tenantBReceivedNotification = true;
                },
            );

            const response = await sendEventRequest(
                tenantA.apiKey,
                `live-${randomUUID()}`,
                createEventPayload(eventName),
            );

            expect(response.status).toBe(202);

            const notification = await Promise.race([
                notificationPromise,
                new Promise<never>((_, reject) => {
                    timeout = setTimeout(() => {
                        reject(
                            new Error("Live notification was not received within 5 seconds."),
                        );
                    }, 5000);
                }),
            ]);

            expect(notification.tenantId).toBe(tenantA.tenantId);
            expect(notification.eventCount).toBe(1);
            expect(notification.eventNames).toContain(eventName);
            expect(notification.latestEventAt).toBeTruthy();

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(tenantBReceivedNotification).toBe(false);
        } finally {
            if (timeout) clearTimeout(timeout);

            unsubscribeA?.();
            unsubscribeB?.();

            await cleanupTestContext(tenantA);
            await cleanupTestContext(tenantB);
        }
    }, 30000);

    it("rejects an invalid API key", async () => {
        const invalidApiKey = `atlas_${"a".repeat(64)}`;

        const response = await sendEventRequest(
            invalidApiKey,
            `invalid-${randomUUID()}`,
            createEventPayload("invalid_key_event"),
        );

        expect(response.status).toBe(401);
    }, 30000);

    it("rejects batches containing more than 500 events", async () => {
        const context = await createTestContext();

        try {
            const events = Array.from(
                { length: 501 },
                (_, index) => createEventPayload(`batch_event_${index}`),
            );

            const response = await sendEventRequest(
                context.apiKey,
                `large-batch-${randomUUID()}`,
                { events },
            );

            expect(response.status).toBe(400);

            const eventCount = await adminDb.event.count({
                where: { tenantId: context.tenantId },
            });

            expect(eventCount).toBe(0);
        } finally {
            await cleanupTestContext(context);
        }
    }, 30000);

    it("rejects events from a suspended tenant", async () => {
        const context = await createTestContext();

        try {
            await adminDb.tenant.update({
                where: { id: context.tenantId },
                data: { suspendedAt: new Date() },
            });

            const response = await sendEventRequest(
                context.apiKey,
                `suspended-${randomUUID()}`,
                createEventPayload("suspended_tenant_event"),
            );

            expect(response.status).toBe(403);

            const eventCount = await adminDb.event.count({
                where: { tenantId: context.tenantId },
            });

            expect(eventCount).toBe(0);
        } finally {
            await cleanupTestContext(context);
        }
    }, 30000);
});
