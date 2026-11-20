
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { randomUUID } from "node:crypto";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL must be configured.");
}

const db = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
});

const TOTAL_EVENTS = Number(
    process.env.SEED_TOTAL_EVENTS ?? "5000000",
);

const BATCH_SIZE = 5000;
const EVENTS_PER_JOURNEY = 6;

const SEED_SOURCE = "atlas-seed-v2";
const SEED_RUN_ID = randomUUID()

const KEEP_OLD_SEED = process.env.SEED_KEEP_OLD === "true";

const journeyTemplates: string[][] = [
    [
        "Page Viewed",
        "Product Viewed",
        "Add to Cart",
        "Checkout Started",
        "Purchase Completed",
    ],
    [
        "Page Viewed",
        "Product Viewed",
        "Add to Cart",
        "Checkout Started",
        "Checkout Abandoned",
    ],
    [
        "Page Viewed",
        "Category Viewed",
        "Product Viewed",
        "Search Performed",
        "Product Viewed",
    ],
    [
        "Page Viewed",
        "Search Performed",
        "Product Viewed",
        "Add to Cart",
        "Cart Viewed",
    ],
];

const categories = [
    "Electronics",
    "Clothing",
    "Home",
    "Books",
    "Sports",
];

const devices = ["desktop", "mobile", "tablet"];

const countries = ["IN", "US", "GB", "CA", "AU"];

const seedEvents = async () => {
    if (!Number.isSafeInteger(TOTAL_EVENTS) || TOTAL_EVENTS < 1) {
        throw new Error("SEED_TOTAL_EVENTS must be a positive integer.");
    }

    try {
        const tenants = await db.tenant.findMany({
            select: {
                id: true,
            },
            orderBy: {
                id: "asc",
            },
        });

        if (tenants.length < 3) {
            throw new Error("At least 3 tenants are required for seeding.");
        }

        console.log(`Found ${tenants.length} tenants.`);
        console.log(`Target events: ${TOTAL_EVENTS.toLocaleString()}`);

        const endDate = new Date();

        const startDate = new Date(
            endDate.getTime() - 90 * 24 * 60 * 60 * 1000,
        );

        const baseCount = Math.floor(TOTAL_EVENTS / tenants.length);
        const remainder = TOTAL_EVENTS % tenants.length;

        let totalInserted = 0;

        for (const [tenantIndex, tenant] of tenants.entries()) {
            const tenantCount =
                baseCount + (tenantIndex < remainder ? 1 : 0);

            const journeyCount = Math.ceil(
                tenantCount / EVENTS_PER_JOURNEY,
            );

            console.log(
                `Seeding ${tenantCount.toLocaleString()} realistic events for tenant ${tenant.id}`,
            );

            for (
                let offset = 0;
                offset < tenantCount;
                offset += BATCH_SIZE
            ) {
                const batchCount = Math.min(
                    BATCH_SIZE,
                    tenantCount - offset,
                );

                const batch = Array.from(
                    { length: batchCount },
                    (_, batchIndex) => {
                        const eventIndex = offset + batchIndex;

                        const journeyIndex = Math.floor(
                            eventIndex / EVENTS_PER_JOURNEY,
                        );

                        const step = eventIndex % EVENTS_PER_JOURNEY;

                        const journeyType =
                            journeyIndex % journeyTemplates.length;

                        const eventName =
                            step === 0
                                ? "Sign Up"
                                : journeyTemplates[journeyType]![step - 1]!;

                        const distinctId =
                            `seed-user-${tenantIndex}-${journeyIndex}`;

                        const sessionId =
                            `seed-session-${tenantIndex}-${journeyIndex}`;

                        const productNumber =
                            (journeyIndex % 1000) + 1;

                        const productId = `product-${productNumber}`;

                        const category =
                            categories[journeyIndex % categories.length]!;

                        const deviceType =
                            devices[journeyIndex % devices.length]!;

                        const country =
                            countries[journeyIndex % countries.length]!;

                        const journeyProgress =
                            journeyCount > 1
                                ? journeyIndex / (journeyCount - 1)
                                : 0;

                        const availableDuration =
                            endDate.getTime() -
                            startDate.getTime() -
                            5 * 60 * 1000;

                        const journeyStartedAt = new Date(
                            startDate.getTime() +
                            journeyProgress * availableDuration,
                        );

                        const occurredAt = new Date(
                            journeyStartedAt.getTime() + step * 30_000,
                        );

                        const properties: Record<
                            string,
                            string | number | boolean
                        > = {
                            seedSource: SEED_SOURCE,
                            seedRunId: SEED_RUN_ID,
                            seedUser: distinctId,
                            source: "seed-script",
                            sessionId,
                            journeyType: [
                                "converted",
                                "checkout-abandoned",
                                "browsing",
                                "cart-abandoned",
                            ][journeyType]!,
                            step: step + 1,
                            deviceType,
                            country,
                        };

                        if (eventName === "Sign Up") {
                            properties.signupMethod =
                                journeyIndex % 2 === 0
                                    ? "email"
                                    : "google";
                        }

                        if (eventName === "Page Viewed") {
                            properties.pagePath =
                                journeyIndex % 2 === 0
                                    ? "/"
                                    : "/products";
                            properties.referrer = "direct";
                        }

                        if (eventName === "Category Viewed") {
                            properties.category = category;
                        }

                        if (eventName === "Search Performed") {
                            properties.searchTerm = category.toLowerCase();
                        }

                        if (
                            [
                                "Product Viewed",
                                "Add to Cart",
                                "Purchase Completed",
                            ].includes(eventName)
                        ) {
                            properties.productId = productId;
                            properties.category = category;
                            properties.price =
                                19.99 + (journeyIndex % 200);
                            properties.currency = "USD";
                        }

                        if (
                            [
                                "Add to Cart",
                                "Cart Viewed",
                                "Checkout Started",
                                "Checkout Abandoned",
                                "Purchase Completed",
                            ].includes(eventName)
                        ) {
                            properties.cartId =
                                `cart-${tenantIndex}-${journeyIndex}`;
                        }

                        if (eventName === "Checkout Started") {
                            properties.checkoutId =
                                `checkout-${tenantIndex}-${journeyIndex}`;
                        }

                        if (eventName === "Checkout Abandoned") {
                            properties.abandonmentReason =
                                "session-ended";
                        }

                        if (eventName === "Purchase Completed") {
                            properties.orderId =
                                `order-${tenantIndex}-${journeyIndex}`;
                            properties.revenue =
                                19.99 + (journeyIndex % 200);
                            properties.currency = "USD";
                        }

                        return {
                            tenantId: tenant.id,
                            apiKeyId: null,
                            userId: null,
                            eventName,
                            distinctId,
                            occurredAt,
                            properties,
                        };
                    },
                );

                const result = await db.event.createMany({
                    data: batch,
                });

                totalInserted += result.count;

                if (totalInserted % 50000 < BATCH_SIZE) {
                    console.log(
                        `Inserted ${totalInserted.toLocaleString()} events...`,
                    );
                }
            }
        }

        console.log(
            `Successfully inserted ${totalInserted.toLocaleString()} realistic events.`,
        );

        // Delete previous seed datasets only after the new run succeeds.
        if (!KEEP_OLD_SEED) {
            const deletedV2 = await db.$executeRaw`
        DELETE FROM "Event"
        WHERE "properties"->>'seedSource' = ${SEED_SOURCE}
          AND "properties"->>'seedRunId' IS DISTINCT FROM ${SEED_RUN_ID}
    `;

            console.log(`Removed previous v2 seed events: ${deletedV2}`);

            const deletedV1 = await db.$executeRaw`
        DELETE FROM "Event"
        WHERE "properties"->>'seedSource' = 'atlas-seed-v1'
    `;

            console.log(`Removed previous v1 seed events: ${deletedV1}`);
        } else {
            console.log("Keeping previous seed data because SEED_KEEP_OLD=true.");
        }

        console.log("Realistic event seeding completed successfully.");
    } finally {
        await db.$disconnect();
    }
};

void seedEvents().catch((error) => {
    console.error("Event seeding failed:", error);
    process.exitCode = 1;
});
