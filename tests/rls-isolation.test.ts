
import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../src/generated/prisma/client";

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

afterAll(async () => {
    await appDb.$disconnect();
    await adminDb.$disconnect();
});

describe("PostgreSQL tenant isolation", () => {
    it("connects using atlas_app role without RLS bypass", async () => {
        const roleInfo = await appDb.$queryRaw<
            Array<{
                roleName: string;
                bypassRls: boolean;
                isSuperuser: boolean;
            }>
        >`
            SELECT
                current_user AS "roleName",
                rolbypassrls AS "bypassRls",
                rolsuper AS "isSuperuser"
            FROM pg_roles
            WHERE rolname = current_user
        `;

        expect(roleInfo).toHaveLength(1);
        expect(roleInfo[0]?.roleName).toBe("atlas_app");
        expect(roleInfo[0]?.bypassRls).toBe(false);
        expect(roleInfo[0]?.isSuperuser).toBe(false);
    });

    it("does not expose Tenant B events in Tenant A context", async () => {
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const eventNameA = `rls_test_a_${suffix}`;
        const eventNameB = `rls_test_b_${suffix}`;

        let tenantAId: string | undefined;
        let tenantBId: string | undefined;

        try {
            const tenantA = await adminDb.tenant.create({
                data: {
                    name: "RLS Test Tenant A",
                    slug: `rls-test-a-${suffix}`,
                },
            });
            tenantAId = tenantA.id;

            const tenantB = await adminDb.tenant.create({
                data: {
                    name: "RLS Test Tenant B",
                    slug: `rls-test-b-${suffix}`,
                },
            });
            tenantBId = tenantB.id;

            await adminDb.event.createMany({
                data: [
                    {
                        tenantId: tenantA.id,
                        eventName: eventNameA,
                        distinctId: "test-user-a",
                        occurredAt: new Date(),
                    },
                    {
                        tenantId: tenantB.id,
                        eventName: eventNameB,
                        distinctId: "test-user-b",
                        occurredAt: new Date(),
                    },
                ],
            });

            const visibleEvents = await appDb.$transaction(async (tx) => {
                await tx.$queryRaw`
                    SELECT set_config('app.tenant_id', ${tenantA.id}, true)
                `;

                return tx.$queryRaw<
                    Array<{ tenantId: string; eventName: string }>
                >`SELECT * FROM "Event"`;
            });

            expect(
                visibleEvents.some((event) => event.tenantId === tenantB.id),
            ).toBe(false);

            expect(
                visibleEvents.some(
                    (event) =>
                        event.tenantId === tenantA.id &&
                        event.eventName === eventNameA,
                ),
            ).toBe(true);
        } finally {
            const tenantIds = [tenantAId, tenantBId].filter(
                (id): id is string => Boolean(id),
            );

            if (tenantIds.length > 0) {
                await adminDb.tenant.deleteMany({
                    where: { id: { in: tenantIds } },
                });
            }
        }
    });

    it("does not expose Tenant B API key rate limits in Tenant A context", async () => {
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        let tenantAId: string | undefined;
        let tenantBId: string | undefined;
        let userId: string | undefined;

        try {
            const user = await adminDb.user.create({
                data: {
                    name: "RLS Test User",
                    email: `rls-test-${suffix}@example.com`,
                },
            });
            userId = user.id;

            const tenantA = await adminDb.tenant.create({
                data: {
                    name: "Rate Limit Tenant A",
                    slug: `rate-limit-a-${suffix}`,
                },
            });
            tenantAId = tenantA.id;

            const tenantB = await adminDb.tenant.create({
                data: {
                    name: "Rate Limit Tenant B",
                    slug: `rate-limit-b-${suffix}`,
                },
            });
            tenantBId = tenantB.id;

            const apiKeyA = await adminDb.apiKey.create({
                data: {
                    tenantId: tenantA.id,
                    createdById: user.id,
                    name: "Tenant A Test Key",
                    keyHash: `test-key-a-${suffix}`,
                },
            });

            const apiKeyB = await adminDb.apiKey.create({
                data: {
                    tenantId: tenantB.id,
                    createdById: user.id,
                    name: "Tenant B Test Key",
                    keyHash: `test-key-b-${suffix}`,
                },
            });

            await adminDb.apiKeyRateLimit.createMany({
                data: [
                    { apiKeyId: apiKeyA.id },
                    { apiKeyId: apiKeyB.id },
                ],
            });

            const visibleRateLimits = await appDb.$transaction(async (tx) => {
                await tx.$queryRaw`
                    SELECT set_config('app.tenant_id', ${tenantA.id}, true)
                `;

                return tx.$queryRaw<
                    Array<{ apiKeyId: string }>
                >`SELECT * FROM "ApiKeyRateLimit"`;
            });

            expect(
                visibleRateLimits.some(
                    (item) => item.apiKeyId === apiKeyB.id,
                ),
            ).toBe(false);

            expect(
                visibleRateLimits.some(
                    (item) => item.apiKeyId === apiKeyA.id,
                ),
            ).toBe(true);
        } finally {
            const tenantIds = [tenantAId, tenantBId].filter(
                (id): id is string => Boolean(id),
            );

            if (tenantIds.length > 0) {
                await adminDb.tenant.deleteMany({
                    where: { id: { in: tenantIds } },
                });
            }

            if (userId) {
                await adminDb.user.delete({
                    where: { id: userId },
                });
            }
        }
    }, 15000);

    it("does not expose Tenant B rollups in Tenant A context", async () => {
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const bucketStart = new Date("2026-11-04T00:00:00.000Z");

        let tenantAId: string | undefined;
        let tenantBId: string | undefined;

        try {
            const tenantA = await adminDb.tenant.create({
                data: {
                    name: "Rollup Test Tenant A",
                    slug: `rollup-test-a-${suffix}`,
                },
            });
            tenantAId = tenantA.id;

            const tenantB = await adminDb.tenant.create({
                data: {
                    name: "Rollup Test Tenant B",
                    slug: `rollup-test-b-${suffix}`,
                },
            });
            tenantBId = tenantB.id;

            await Promise.all([
                adminDb.tenantHourlyRollup.createMany({
                    data: [
                        {
                            tenantId: tenantA.id,
                            bucketStart,
                            eventCount: 10,
                        },
                        {
                            tenantId: tenantB.id,
                            bucketStart,
                            eventCount: 20,
                        },
                    ],
                }),

                adminDb.tenantDailyRollup.createMany({
                    data: [
                        {
                            tenantId: tenantA.id,
                            bucketStart,
                            eventCount: 10,
                        },
                        {
                            tenantId: tenantB.id,
                            bucketStart,
                            eventCount: 20,
                        },
                    ],
                }),

                adminDb.eventHourlyRollup.createMany({
                    data: [
                        {
                            tenantId: tenantA.id,
                            bucketStart,
                            eventName: "test_event",
                            eventCount: 10,
                        },
                        {
                            tenantId: tenantB.id,
                            bucketStart,
                            eventName: "test_event",
                            eventCount: 20,
                        },
                    ],
                }),

                adminDb.eventDailyRollup.createMany({
                    data: [
                        {
                            tenantId: tenantA.id,
                            bucketStart,
                            eventName: "test_event",
                            eventCount: 10,
                        },
                        {
                            tenantId: tenantB.id,
                            bucketStart,
                            eventName: "test_event",
                            eventCount: 20,
                        },
                    ],
                }),
            ]);

            const visibleRollups = await appDb.$transaction(async (tx) => {
                await tx.$queryRaw`
                    SELECT set_config('app.tenant_id', ${tenantA.id}, true)
                `;

                const tenantHourly = await tx.$queryRaw<
                    Array<{ tenantId: string }>
                >`SELECT * FROM "TenantHourlyRollup"`;

                const tenantDaily = await tx.$queryRaw<
                    Array<{ tenantId: string }>
                >`SELECT * FROM "TenantDailyRollup"`;

                const eventHourly = await tx.$queryRaw<
                    Array<{ tenantId: string }>
                >`SELECT * FROM "EventHourlyRollup"`;

                const eventDaily = await tx.$queryRaw<
                    Array<{ tenantId: string }>
                >`SELECT * FROM "EventDailyRollup"`;

                return {
                    tenantHourly,
                    tenantDaily,
                    eventHourly,
                    eventDaily,
                };
            });

            for (const rows of Object.values(visibleRollups)) {
                expect(
                    rows.some((row) => row.tenantId === tenantB.id),
                ).toBe(false);

                expect(
                    rows.some((row) => row.tenantId === tenantA.id),
                ).toBe(true);
            }
        } finally {
            const tenantIds = [tenantAId, tenantBId].filter(
                (id): id is string => Boolean(id),
            );

            if (tenantIds.length > 0) {
                await adminDb.tenant.deleteMany({
                    where: { id: { in: tenantIds } },
                });
            }
        }
    });

    it("does not expose Tenant B records across remaining tenant-scoped tables", async () => {
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        let tenantAId: string | undefined;
        let tenantBId: string | undefined;
        let userId: string | undefined;

        try {
            const user = await adminDb.user.create({
                data: {
                    name: "RLS Coverage Test User",
                    email: `rls-coverage-${suffix}@example.com`,
                },
            });

            userId = user.id;

            const tenantA = await adminDb.tenant.create({
                data: {
                    name: "Coverage Tenant A",
                    slug: `coverage-a-${suffix}`,
                },
            });

            tenantAId = tenantA.id;

            const tenantB = await adminDb.tenant.create({
                data: {
                    name: "Coverage Tenant B",
                    slug: `coverage-b-${suffix}`,
                },
            });

            tenantBId = tenantB.id;

            await adminDb.membership.createMany({
                data: [
                    {
                        userId: user.id,
                        tenantId: tenantA.id,
                        role: "OWNER",
                    },
                    {
                        userId: user.id,
                        tenantId: tenantB.id,
                        role: "OWNER",
                    },
                ],
            });

            await adminDb.apiKey.createMany({
                data: [
                    {
                        tenantId: tenantA.id,
                        createdById: user.id,
                        name: "Tenant A Key",
                        keyHash: `coverage-key-a-${suffix}`,
                    },
                    {
                        tenantId: tenantB.id,
                        createdById: user.id,
                        name: "Tenant B Key",
                        keyHash: `coverage-key-b-${suffix}`,
                    },
                ],
            });

            await adminDb.invitation.createMany({
                data: [
                    {
                        tenantId: tenantA.id,
                        email: `a-${suffix}@example.com`,
                        role: "VIEWER",
                        tokenHash: `coverage-token-a-${suffix}`,
                        invitedById: user.id,
                        expiresAt: new Date(Date.now() + 86400000),
                    },
                    {
                        tenantId: tenantB.id,
                        email: `b-${suffix}@example.com`,
                        role: "VIEWER",
                        tokenHash: `coverage-token-b-${suffix}`,
                        invitedById: user.id,
                        expiresAt: new Date(Date.now() + 86400000),
                    },
                ],
            });

            await adminDb.eventIngestionRequest.createMany({
                data: [
                    {
                        tenantId: tenantA.id,
                        idempotencyKeyHash: `coverage-request-a-${suffix}`,
                        expiresAt: new Date(Date.now() + 86400000),
                    },
                    {
                        tenantId: tenantB.id,
                        idempotencyKeyHash: `coverage-request-b-${suffix}`,
                        expiresAt: new Date(Date.now() + 86400000),
                    },
                ],
            });

            const visibleRecords = await appDb.$transaction(async (tx) => {
                await tx.$queryRaw`
                SELECT set_config('app.tenant_id', ${tenantA.id}, true)
            `;

                const tenants = await tx.$queryRaw<
                    Array<{ id: string }>
                >`SELECT * FROM "Tenant"`;

                const memberships = await tx.$queryRaw<
                    Array<{ tenantId: string }>
                >`SELECT * FROM "Membership"`;

                const apiKeys = await tx.$queryRaw<
                    Array<{ tenantId: string }>
                >`SELECT * FROM "ApiKey"`;

                const invitations = await tx.$queryRaw<
                    Array<{ tenantId: string }>
                >`SELECT * FROM "Invitation"`;

                const ingestionRequests = await tx.$queryRaw<
                    Array<{ tenantId: string }>
                >`SELECT * FROM "EventIngestionRequest"`;

                return {
                    tenants,
                    memberships,
                    apiKeys,
                    invitations,
                    ingestionRequests,
                };
            });

            expect(
                visibleRecords.tenants.some((row) => row.id === tenantB.id),
            ).toBe(false);

            expect(
                visibleRecords.tenants.some((row) => row.id === tenantA.id),
            ).toBe(true);

            for (const rows of [
                visibleRecords.memberships,
                visibleRecords.apiKeys,
                visibleRecords.invitations,
                visibleRecords.ingestionRequests,
            ]) {
                expect(
                    rows.some((row) => row.tenantId === tenantB.id),
                ).toBe(false);

                expect(
                    rows.some((row) => row.tenantId === tenantA.id),
                ).toBe(true);
            }
        } finally {
            const tenantIds = [tenantAId, tenantBId].filter(
                (id): id is string => Boolean(id),
            );

            if (tenantIds.length > 0) {
                await adminDb.tenant.deleteMany({
                    where: { id: { in: tenantIds } },
                });
            }

            if (userId) {
                await adminDb.user.delete({
                    where: { id: userId },
                });
            }
        }
    }, 15000);


    it("restricts special lookup policies to the matching user, API key, and invitation", async () => {
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        let tenantAId: string | undefined;
        let tenantBId: string | undefined;
        let userAId: string | undefined;
        let userBId: string | undefined;

        try {
            const userA = await adminDb.user.create({
                data: {
                    email: `lookup-a-${suffix}@example.com`,
                    name: "Lookup User A",
                },
            });
            userAId = userA.id;

            const userB = await adminDb.user.create({
                data: {
                    email: `lookup-b-${suffix}@example.com`,
                    name: "Lookup User B",
                },
            });
            userBId = userB.id;

            const tenantA = await adminDb.tenant.create({
                data: {
                    name: "Lookup Tenant A",
                    slug: `lookup-a-${suffix}`,
                },
            });
            tenantAId = tenantA.id;

            const tenantB = await adminDb.tenant.create({
                data: {
                    name: "Lookup Tenant B",
                    slug: `lookup-b-${suffix}`,
                },
            });
            tenantBId = tenantB.id;

            await adminDb.membership.createMany({
                data: [
                    { userId: userA.id, tenantId: tenantA.id, role: "OWNER" },
                    { userId: userA.id, tenantId: tenantB.id, role: "VIEWER" },
                    { userId: userB.id, tenantId: tenantB.id, role: "OWNER" },
                ],
            });

            const apiKeyA = await adminDb.apiKey.create({
                data: {
                    tenantId: tenantA.id,
                    createdById: userA.id,
                    name: "Lookup Key A",
                    keyHash: `lookup-key-a-${suffix}`,
                    keyLookupHash: `lookup-hash-a-${suffix}`,
                },
            });

            const apiKeyB = await adminDb.apiKey.create({
                data: {
                    tenantId: tenantB.id,
                    createdById: userA.id,
                    name: "Lookup Key B",
                    keyHash: `lookup-key-b-${suffix}`,
                    keyLookupHash: `lookup-hash-b-${suffix}`,
                },
            });

            const invitationA = await adminDb.invitation.create({
                data: {
                    tenantId: tenantA.id,
                    email: `invite-a-${suffix}@example.com`,
                    role: "VIEWER",
                    tokenHash: `lookup-token-a-${suffix}`,
                    invitedById: userA.id,
                    expiresAt: new Date(Date.now() + 86400000),
                },
            });

            const invitationB = await adminDb.invitation.create({
                data: {
                    tenantId: tenantB.id,
                    email: `invite-b-${suffix}@example.com`,
                    role: "VIEWER",
                    tokenHash: `lookup-token-b-${suffix}`,
                    invitedById: userA.id,
                    expiresAt: new Date(Date.now() + 86400000),
                },
            });

            const results = await appDb.$transaction(async (tx) => {
                await tx.$queryRaw`
                    SELECT set_config('app.user_id', ${userA.id}, true)
                `;

                const memberships = await tx.$queryRaw<
                    Array<{ userId: string; tenantId: string }>
                >`SELECT * FROM "Membership"`;

                await tx.$queryRaw`
                    SELECT set_config(
                        'app.api_key_hash',
                        ${`lookup-hash-b-${suffix}`},
                        true
                    )
                `;

                const apiKeys = await tx.$queryRaw<
                    Array<{ id: string }>
                >`SELECT * FROM "ApiKey"`;

                await tx.$queryRaw`
                    SELECT set_config(
                        'app.invitation_token_hash',
                        ${`lookup-token-b-${suffix}`},
                        true
                    )
                `;

                const invitations = await tx.$queryRaw<
                    Array<{ id: string }>
                >`SELECT * FROM "Invitation"`;

                return { memberships, apiKeys, invitations };
            });

            expect(results.memberships).toHaveLength(2);
            expect(
                results.memberships.every((row) => row.userId === userA.id),
            ).toBe(true);

            expect(results.apiKeys).toHaveLength(1);
            expect(results.apiKeys[0]?.id).toBe(apiKeyB.id);
            expect(results.apiKeys.some((row) => row.id === apiKeyA.id)).toBe(false);

            expect(results.invitations).toHaveLength(1);
            expect(results.invitations[0]?.id).toBe(invitationB.id);
            expect(
                results.invitations.some((row) => row.id === invitationA.id),
            ).toBe(false);
        } finally {
            const tenantIds = [tenantAId, tenantBId].filter(
                (id): id is string => Boolean(id),
            );

            if (tenantIds.length > 0) {
                await adminDb.tenant.deleteMany({
                    where: { id: { in: tenantIds } },
                });
            }

            const userIds = [userAId, userBId].filter(
                (id): id is string => Boolean(id),
            );

            if (userIds.length > 0) {
                await adminDb.user.deleteMany({
                    where: { id: { in: userIds } },
                });
            }
        }
    }, 15000);
});
