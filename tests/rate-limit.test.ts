
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../src/generated/prisma/client";
import {
    createApiKey,
    createApiKeyLookupHash,
    hashApiKey,
} from "../src/lib/api-key";
import { consumeApiKeyToken } from "../src/lib/rate-limit";

const databaseUrl = process.env.DATABASE_URL;
const appDatabaseUrl = process.env.APP_DATABASE_URL;

if (!databaseUrl || !appDatabaseUrl) {
    throw new Error(
        "DATABASE_URL and APP_DATABASE_URL must be configured in .env",
    );
}

const adminDb = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
});

const appDb = new PrismaClient({
    datasources: {
        db: {
            url: appDatabaseUrl,
        },
    },
});

const createTestContext = async () => {
    const suffix = randomUUID();

    const user = await adminDb.user.create({
        data: {
            name: "Rate Limit Test User",
            email: `rate-limit-${suffix}@example.com`,
        },
    });

    try {
        const tenant = await adminDb.tenant.create({
            data: {
                name: "Rate Limit Test Tenant",
                slug: `rate-limit-${suffix}`,
            },
        });

        const apiKey = createApiKey();

        const key = await adminDb.apiKey.create({
            data: {
                tenantId: tenant.id,
                createdById: user.id,
                name: "Rate Limit Test Key",
                keyHash: await hashApiKey(apiKey),
                keyLookupHash: createApiKeyLookupHash(apiKey),
            },
        });

        return {
            userId: user.id,
            tenantId: tenant.id,
            apiKeyId: key.id,
        };
    } catch (error) {
        await adminDb.user.deleteMany({
            where: { id: user.id },
        });

        throw error;
    }
};

const consumeToken = async (
    tenantId: string,
    apiKeyId: string,
) => {
    return appDb.$transaction(async (tx) => {
        await tx.$queryRaw`
            SELECT set_config(
                'app.tenant_id',
                ${tenantId},
                true
            )
        `;

        return consumeApiKeyToken(tx, apiKeyId);
    });
};

afterAll(async () => {
    await appDb.$disconnect();
    await adminDb.$disconnect();
});

describe("API key rate limiting", () => {
    it("consumes available tokens and rejects requests when the bucket is empty", async () => {
        const context = await createTestContext();

        try {
            // First request should create the bucket and consume one token.
            const first = await consumeToken(
                context.tenantId,
                context.apiKeyId,
            );

            expect(first.allowed).toBe(true);
            expect(first.retryAfterSeconds).toBe(0);

            const initialBucket = await adminDb.apiKeyRateLimit.findUnique({
                where: {
                    apiKeyId: context.apiKeyId,
                },
            });

            expect(initialBucket).not.toBeNull();
            expect(initialBucket!.tokens).toBeLessThan(100);
            expect(initialBucket!.tokens).toBeGreaterThanOrEqual(99);

            // Force an empty bucket and prevent refill during this test.
            await adminDb.apiKeyRateLimit.update({
                where: {
                    apiKeyId: context.apiKeyId,
                },
                data: {
                    tokens: 0,
                    lastRefillAt: new Date(Date.now() + 60_000),
                },
            });

            const rejected = await consumeToken(
                context.tenantId,
                context.apiKeyId,
            );

            expect(rejected.allowed).toBe(false);
            expect(rejected.retryAfterSeconds).toBe(1);

            const emptyBucket = await adminDb.apiKeyRateLimit.findUnique({
                where: {
                    apiKeyId: context.apiKeyId,
                },
            });

            expect(emptyBucket?.tokens).toBe(0);

            // Give the bucket one token and verify that it is accepted.
            await adminDb.apiKeyRateLimit.update({
                where: {
                    apiKeyId: context.apiKeyId,
                },
                data: {
                    tokens: 1,
                    lastRefillAt: new Date(Date.now() + 60_000),
                },
            });

            const accepted = await consumeToken(
                context.tenantId,
                context.apiKeyId,
            );

            expect(accepted.allowed).toBe(true);
            expect(accepted.retryAfterSeconds).toBe(0);

            const finalBucket = await adminDb.apiKeyRateLimit.findUnique({
                where: {
                    apiKeyId: context.apiKeyId,
                },
            });

            expect(finalBucket?.tokens).toBe(0);
        } finally {
            await adminDb.tenant.deleteMany({
                where: {
                    id: context.tenantId,
                },
            });

            await adminDb.user.deleteMany({
                where: {
                    id: context.userId,
                },
            });
        }
    }, 30000);
});
