
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

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

const eventNames: string[] = [
    "Page Viewed",
    "Product Viewed",
    "Add to Cart",
    "Checkout Started",
    "Purchase Completed",
];

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

        // Remove only records created by this seed script.
        const deleted = await db.$executeRaw`
            DELETE FROM "Event"
            WHERE "properties" @> '{"seedSource":"atlas-seed-v1"}'::jsonb
        `;

        console.log(`Removed previous seed events: ${deleted}`);

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

            console.log(
                `Seeding ${tenantCount.toLocaleString()} events for tenant ${tenant.id}`,
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

                        const progress =
                            tenantCount > 1
                                ? eventIndex / (tenantCount - 1)
                                : 0;

                        const occurredAt = new Date(
                            startDate.getTime() +
                            progress *
                            (endDate.getTime() - startDate.getTime()),
                        );

                        const eventName =
                            eventNames[
                            Math.floor(Math.random() * eventNames.length)
                            ]!;

                        const distinctId = `seed-user-${Math.floor(Math.random() * 100000)
                            }`;

                        return {
                            tenantId: tenant.id,
                            apiKeyId: null,
                            userId: null,
                            eventName,
                            distinctId,
                            occurredAt,
                            properties: {
                                seedSource: "atlas-seed-v1",
                                seedUser: distinctId,
                                source: "seed-script",
                            },
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
            `Successfully inserted ${totalInserted.toLocaleString()} events.`,
        );
    } finally {
        await db.$disconnect();
    }
};

void seedEvents().catch((error) => {
    console.error("Event seeding failed:", error);
    process.exitCode = 1;
});
