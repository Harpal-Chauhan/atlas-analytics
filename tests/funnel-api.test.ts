
import "dotenv/config";
import {
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";

const authMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
    auth: authMock,
}));

import { GET } from "../src/app/api/analytics/funnel/route";

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

type TestContext = {
    userId: string;
    tenantId: string;
};

const createTestContext = async (): Promise<TestContext> => {
    const suffix = randomUUID();

    const user = await adminDb.user.create({
        data: {
            name: "Funnel API Test User",
            email: `funnel-${suffix}@example.com`,
        },
    });

    try {
        const tenant = await adminDb.tenant.create({
            data: {
                name: "Funnel API Test Tenant",
                slug: `funnel-${suffix}`,
            },
        });

        await adminDb.membership.create({
            data: {
                userId: user.id,
                tenantId: tenant.id,
                role: "OWNER",
            },
        });

        return {
            userId: user.id,
            tenantId: tenant.id,
        };
    } catch (error) {
        await adminDb.user.deleteMany({
            where: { id: user.id },
        });

        throw error;
    }
};

const cleanupTestContext = async (context: TestContext) => {
    await adminDb.tenant.deleteMany({
        where: { id: context.tenantId },
    });

    await adminDb.user.deleteMany({
        where: { id: context.userId },
    });
};

const sendFunnelRequest = async (
    params: URLSearchParams,
) => {
    const request = new Request(
        `http://localhost/api/analytics/funnel?${params.toString()}`,
    );

    return GET(request);
};

const createFunnelParams = (
    steps: string[],
    conversionWindowDays = 7,
) => {
    const params = new URLSearchParams();

    for (const step of steps) {
        params.append("step", step);
    }

    params.set("startDate", "2026-01-01");
    params.set("endDate", "2026-01-31");
    params.set(
        "conversionWindowDays",
        String(conversionWindowDays),
    );

    return params;
};

beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue(null);
});

afterAll(async () => {
    await adminDb.$disconnect();
});

describe("Funnel analytics API integration", () => {
    it("rejects unauthenticated requests", async () => {
        const response = await sendFunnelRequest(
            createFunnelParams(["Sign Up", "Purchase"]),
        );

        expect(response.status).toBe(401);
    });

    it("rejects requests without an active tenant", async () => {
        authMock.mockResolvedValue({
            user: {
                id: "test-user",
                activeTenantId: null,
            },
        });

        const response = await sendFunnelRequest(
            createFunnelParams(["Sign Up", "Purchase"]),
        );

        expect(response.status).toBe(409);
    });

    it("rejects invalid funnel parameters", async () => {
        const context: TestContext = {
            userId: "test-user",
            tenantId: "test-tenant",
        };

        authMock.mockResolvedValue({
            user: {
                id: context.userId,
                activeTenantId: context.tenantId,
            },
        });

        const duplicateSteps = await sendFunnelRequest(
            createFunnelParams(["Sign Up", "Sign Up"]),
        );

        expect(duplicateSteps.status).toBe(400);

        const tooFewSteps = await sendFunnelRequest(
            createFunnelParams(["Sign Up"]),
        );

        expect(tooFewSteps.status).toBe(400);

        const invalidWindow = await sendFunnelRequest(
            createFunnelParams(["Sign Up", "Purchase"], 31),
        );

        expect(invalidWindow.status).toBe(400);
    });

    it("calculates ordered conversions within the window and isolates tenant data", async () => {
        const context = await createTestContext();

        let otherTenantId: string | undefined;

        try {
            authMock.mockResolvedValue({
                user: {
                    id: context.userId,
                    activeTenantId: context.tenantId,
                },
            });

            const otherTenant = await adminDb.tenant.create({
                data: {
                    name: "Other Funnel Tenant",
                    slug: `other-funnel-${randomUUID()}`,
                },
            });

            otherTenantId = otherTenant.id;

            const event = (
                tenantId: string,
                distinctId: string,
                eventName: string,
                occurredAt: string,
            ) => ({
                tenantId,
                distinctId,
                eventName,
                occurredAt: new Date(occurredAt),
            });

            await adminDb.event.createMany({
                data: [
                    // User 1: completes all three steps.
                    event(context.tenantId, "user-1", "Sign Up", "2026-01-02T10:00:00Z"),
                    event(context.tenantId, "user-1", "View Product", "2026-01-03T10:00:00Z"),
                    event(context.tenantId, "user-1", "Purchase", "2026-01-04T10:00:00Z"),

                    // User 2: purchase happens before View Product.
                    // Should reach step 2, but not step 3.
                    event(context.tenantId, "user-2", "Sign Up", "2026-01-05T10:00:00Z"),
                    event(context.tenantId, "user-2", "Purchase", "2026-01-06T10:00:00Z"),
                    event(context.tenantId, "user-2", "View Product", "2026-01-07T10:00:00Z"),

                    // User 3: completes all three steps.
                    event(context.tenantId, "user-3", "Sign Up", "2026-01-08T10:00:00Z"),
                    event(context.tenantId, "user-3", "View Product", "2026-01-09T10:00:00Z"),
                    event(context.tenantId, "user-3", "Purchase", "2026-01-10T10:00:00Z"),

                    // User 4: next step occurs outside the 7-day window.
                    event(context.tenantId, "user-4", "Sign Up", "2026-01-12T10:00:00Z"),
                    event(context.tenantId, "user-4", "View Product", "2026-01-20T10:00:00Z"),
                    event(context.tenantId, "user-4", "Purchase", "2026-01-21T10:00:00Z"),

                    // Other tenant: must not affect the result.
                    event(otherTenant.id, "other-user", "Sign Up", "2026-01-02T10:00:00Z"),
                    event(otherTenant.id, "other-user", "View Product", "2026-01-03T10:00:00Z"),
                    event(otherTenant.id, "other-user", "Purchase", "2026-01-04T10:00:00Z"),
                ],
            });

            const response = await sendFunnelRequest(
                createFunnelParams([
                    "Sign Up",
                    "View Product",
                    "Purchase",
                ]),
            );

            expect(response.status).toBe(200);

            const body = await response.json();

            expect(body.totalUsers).toBe(4);
            expect(body.conversionWindowDays).toBe(7);

            expect(body.steps).toHaveLength(3);

            expect(body.steps[0]).toMatchObject({
                eventName: "Sign Up",
                reachedUsers: 4,
                conversionRate: 100,
                dropOff: 0,
            });

            expect(body.steps[1]).toMatchObject({
                eventName: "View Product",
                reachedUsers: 3,
                conversionRate: 75,
                dropOff: 1,
            });

            expect(body.steps[2].eventName).toBe("Purchase");
            expect(body.steps[2].reachedUsers).toBe(2);
            expect(body.steps[2].conversionRate).toBeCloseTo(66.6667, 3);
            expect(body.steps[2].dropOff).toBe(1);
        } finally {
            if (otherTenantId) {
                await adminDb.tenant.deleteMany({
                    where: { id: otherTenantId },
                });
            }

            await cleanupTestContext(context);
        }
    }, 30000);
});
