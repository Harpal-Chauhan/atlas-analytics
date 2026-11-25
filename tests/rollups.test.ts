
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "./test-prisma";
import {
    processTenantRollups,
    disconnectRollupClients,
} from "../scripts/process-rollups";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL must be configured in .env");
}

const adminDb = createTestPrismaClient(databaseUrl);

const createTestTenant = async () => {
    const suffix = randomUUID();

    return adminDb.tenant.create({
        data: {
            name: "Rollup Test Tenant",
            slug: `rollup-test-${suffix}`,
        },
    });
};

const createTestEvents = async (tenantId: string) => {
    await adminDb.event.createMany({
        data: [
            {
                tenantId,
                eventName: "signup",
                distinctId: "user-1",
                occurredAt: new Date("2026-01-15T09:10:00.000Z"),
            },
            {
                tenantId,
                eventName: "click",
                distinctId: "user-1",
                occurredAt: new Date("2026-01-15T09:20:00.000Z"),
            },
            {
                tenantId,
                eventName: "signup",
                distinctId: "user-2",
                occurredAt: new Date("2026-01-15T10:10:00.000Z"),
            },
            {
                tenantId,
                eventName: "signup",
                distinctId: "user-1",
                occurredAt: new Date("2026-01-16T09:10:00.000Z"),
            },
            {
                tenantId,
                eventName: "purchase",
                distinctId: "user-3",
                occurredAt: new Date("2026-01-16T10:10:00.000Z"),
            },
        ],
    });
};

const getRollupSnapshot = async (tenantId: string) => {
    const [
        tenantHourly,
        tenantDaily,
        userActivityDaily,
        eventHourly,
        eventDaily,
    ] = await Promise.all([
        adminDb.tenantHourlyRollup.findMany({
            where: { tenantId },
            orderBy: { bucketStart: "asc" },
        }),
        adminDb.tenantDailyRollup.findMany({
            where: { tenantId },
            orderBy: { bucketStart: "asc" },
        }),
        adminDb.tenantUserActivityDaily.findMany({
            where: { tenantId },
            orderBy: [
                { bucketStart: "asc" },
                { distinctId: "asc" },
            ],
        }),
        adminDb.eventHourlyRollup.findMany({
            where: { tenantId },
            orderBy: [
                { bucketStart: "asc" },
                { eventName: "asc" },
            ],
        }),
        adminDb.eventDailyRollup.findMany({
            where: { tenantId },
            orderBy: [
                { bucketStart: "asc" },
                { eventName: "asc" },
            ],
        }),
    ]);

    return {
        tenantHourly: tenantHourly.map((row) => ({
            bucketStart: row.bucketStart.toISOString(),
            eventCount: row.eventCount.toString(),
            uniqueUsers: row.uniqueUsers.toString(),
        })),

        tenantDaily: tenantDaily.map((row) => ({
            bucketStart: row.bucketStart.toISOString(),
            eventCount: row.eventCount.toString(),
            uniqueUsers: row.uniqueUsers.toString(),
        })),

        userActivityDaily: userActivityDaily.map((row) => ({
            bucketStart: row.bucketStart.toISOString(),
            distinctId: row.distinctId,
        })),

        eventHourly: eventHourly.map((row) => ({
            bucketStart: row.bucketStart.toISOString(),
            eventName: row.eventName,
            eventCount: row.eventCount.toString(),
            uniqueUsers: row.uniqueUsers.toString(),
        })),

        eventDaily: eventDaily.map((row) => ({
            bucketStart: row.bucketStart.toISOString(),
            eventName: row.eventName,
            eventCount: row.eventCount.toString(),
            uniqueUsers: row.uniqueUsers.toString(),
        })),
    };
};

afterAll(async () => {
    await disconnectRollupClients();
    await adminDb.$disconnect();
});

describe("Rollup processing", () => {
    it("rebuilds rollups correctly without double-counting on repeated runs", async () => {
        const tenant = await createTestTenant();

        try {
            await createTestEvents(tenant.id);

            // First rollup run.
            await processTenantRollups(tenant.id);

            const firstSnapshot = await getRollupSnapshot(tenant.id);

            // Verify tenant daily aggregation.
            expect(firstSnapshot.tenantDaily).toEqual([
                {
                    bucketStart: "2026-01-15T00:00:00.000Z",
                    eventCount: "3",
                    uniqueUsers: "2",
                },
                {
                    bucketStart: "2026-01-16T00:00:00.000Z",
                    eventCount: "2",
                    uniqueUsers: "2",
                },
            ]);

            // Verify daily user activity.
            expect(firstSnapshot.userActivityDaily).toHaveLength(4);

            // Verify event-wise daily aggregation.
            expect(firstSnapshot.eventDaily).toHaveLength(4);

            // Second run with unchanged source events.
            await processTenantRollups(tenant.id);

            const secondSnapshot = await getRollupSnapshot(tenant.id);

            // Re-running must not duplicate or double-count data.
            expect(secondSnapshot).toEqual(firstSnapshot);

            // Add another event to an existing day.
            await adminDb.event.create({
                data: {
                    tenantId: tenant.id,
                    eventName: "purchase",
                    distinctId: "user-3",
                    occurredAt: new Date(
                        "2026-01-16T11:10:00.000Z",
                    ),
                },
            });

            // Third run should rebuild using the updated source events.
            await processTenantRollups(tenant.id);

            const thirdSnapshot = await getRollupSnapshot(tenant.id);

            expect(thirdSnapshot.tenantDaily).toEqual([
                {
                    bucketStart: "2026-01-15T00:00:00.000Z",
                    eventCount: "3",
                    uniqueUsers: "2",
                },
                {
                    bucketStart: "2026-01-16T00:00:00.000Z",
                    eventCount: "3",
                    uniqueUsers: "2",
                },
            ]);

            // Same user and event name should increase event count,
            // but should not increase unique user count.
            const purchaseDaily = thirdSnapshot.eventDaily.find(
                (row) =>
                    row.eventName === "purchase" &&
                    row.bucketStart === "2026-01-16T00:00:00.000Z",
            );

            expect(purchaseDaily).toEqual({
                bucketStart: "2026-01-16T00:00:00.000Z",
                eventName: "purchase",
                eventCount: "2",
                uniqueUsers: "1",
            });

            // Daily activity remains unique per user and day.
            expect(thirdSnapshot.userActivityDaily).toHaveLength(4);
        } finally {
            await adminDb.tenant.deleteMany({
                where: { id: tenant.id },
            });
        }
    }, 60000);
});