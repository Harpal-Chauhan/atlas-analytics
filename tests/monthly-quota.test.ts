
import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "./test-prisma";
import { consumeMonthlyQuota } from "../src/lib/monthly-quota";

const databaseUrl = process.env.DATABASE_URL;
const appDatabaseUrl = process.env.APP_DATABASE_URL;

if (!databaseUrl || !appDatabaseUrl) {
    throw new Error(
        "DATABASE_URL and APP_DATABASE_URL must be configured in .env",
    );
}

const adminDb = createTestPrismaClient(databaseUrl);

const appDb = createTestPrismaClient(appDatabaseUrl);

const createTestTenant = async (quota: number) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return adminDb.tenant.create({
        data: {
            name: "Monthly Quota Test Tenant",
            slug: `monthly-quota-${suffix}`,
            monthlyEventQuota: quota,
        },
    });
};

const consumeForTenant = async (
    tenantId: string,
    eventCount: number,
) => {
    return appDb.$transaction(
        async (tx) => {
            await tx.$queryRaw`
                SELECT set_config('app.tenant_id', ${tenantId}, true)
            `;

            return consumeMonthlyQuota(tx, tenantId, eventCount);
        },
        {
            maxWait: 15000,
            timeout: 45000,
        },
    );
};

const cleanupTenant = async (tenantId: string) => {
    await adminDb.tenant.deleteMany({
        where: { id: tenantId },
    });
};

afterAll(async () => {
    await appDb.$disconnect();
    await adminDb.$disconnect();
});

describe("Monthly tenant event quota", () => {
    it("creates and increments monthly usage correctly", async () => {
        const tenant = await createTestTenant(10);

        try {
            const first = await consumeForTenant(tenant.id, 3);

            expect(first).toMatchObject({
                allowed: true,
                used: 3,
                limit: 10,
                remaining: 7,
            });

            const second = await consumeForTenant(tenant.id, 2);

            expect(second).toMatchObject({
                allowed: true,
                used: 5,
                limit: 10,
                remaining: 5,
            });
        } finally {
            await cleanupTenant(tenant.id);
        }
    });

    it("rejects requests that exceed the monthly quota", async () => {
        const tenant = await createTestTenant(5);

        try {
            const first = await consumeForTenant(tenant.id, 4);

            expect(first.allowed).toBe(true);

            const second = await consumeForTenant(tenant.id, 2);

            expect(second).toMatchObject({
                allowed: false,
                used: 4,
                limit: 5,
                remaining: 1,
            });

            const usage = await appDb.$transaction(async (tx) => {
                await tx.$queryRaw`
                    SELECT set_config('app.tenant_id', ${tenant.id}, true)
                `;

                return tx.tenantMonthlyUsage.findFirst({
                    where: { tenantId: tenant.id },
                    select: { eventCount: true },
                });
            });

            expect(usage?.eventCount).toBe(4);
        } finally {
            await cleanupTenant(tenant.id);
        }
    });

    it("rejects a first batch larger than the monthly quota", async () => {
        const tenant = await createTestTenant(5);

        try {
            const result = await consumeForTenant(tenant.id, 6);

            expect(result).toMatchObject({
                allowed: false,
                used: 0,
                limit: 5,
                remaining: 5,
            });

            const usage = await adminDb.tenantMonthlyUsage.findMany({
                where: { tenantId: tenant.id },
            });

            expect(usage).toHaveLength(0);
        } finally {
            await cleanupTenant(tenant.id);
        }
    });

    it("does not exceed the quota during concurrent requests", async () => {
        const tenant = await createTestTenant(10);

        try {
            const results = await Promise.all(
                Array.from({ length: 5 }, () =>
                    consumeForTenant(tenant.id, 3),
                ),
            );

            const allowedResults = results.filter(
                (result) => result.allowed,
            );

            const rejectedResults = results.filter(
                (result) => !result.allowed,
            );

            expect(allowedResults).toHaveLength(3);
            expect(rejectedResults).toHaveLength(2);

            const usage = await adminDb.tenantMonthlyUsage.findFirst({
                where: { tenantId: tenant.id },
                select: { eventCount: true },
            });

            expect(usage?.eventCount).toBe(9);
            expect(usage?.eventCount).toBeLessThanOrEqual(10);
        } finally {
            await cleanupTenant(tenant.id);
        }
    }, 30000);
});