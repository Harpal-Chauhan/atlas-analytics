import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
const appDatabaseUrl = process.env.APP_DATABASE_URL;

if (!databaseUrl || !appDatabaseUrl) {
    throw new Error(
        "DATABASE_URL and APP_DATABASE_URL must be configured.",
    );
}

// Admin connection is only used to discover tenant IDs.
const adminDb = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
});

// App connection performs all tenant-scoped aggregation.
const appDb = new PrismaClient({
    datasources: {
        db: {
            url: appDatabaseUrl,
        },
    },
});

const processTenantRollups = async (tenantId: string) => {
    return appDb.$transaction(async (tx) => {
        await tx.$queryRaw`
            SELECT set_config('app.tenant_id', ${tenantId}, true)
        `;

        // Remove previous rollups so repeated runs do not double-count.
        await tx.$executeRaw`
            DELETE FROM "TenantHourlyRollup"
            WHERE "tenantId" = ${tenantId}
        `;

        await tx.$executeRaw`
            DELETE FROM "TenantDailyRollup"
            WHERE "tenantId" = ${tenantId}
        `;

        await tx.$executeRaw`
            DELETE FROM "EventHourlyRollup"
            WHERE "tenantId" = ${tenantId}
        `;

        await tx.$executeRaw`
            DELETE FROM "EventDailyRollup"
            WHERE "tenantId" = ${tenantId}
        `;

        // Tenant-wise hourly aggregation.
        const tenantHourly = await tx.$executeRaw`
            INSERT INTO "TenantHourlyRollup"
                ("tenantId", "bucketStart", "eventCount", "uniqueUsers", "updatedAt")
            SELECT
                ${tenantId},
                date_trunc('hour', "occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
                COUNT(*)::bigint,
                COUNT(DISTINCT "distinctId")::bigint,
                NOW()
            FROM "Event"
            WHERE "tenantId" = ${tenantId}
            GROUP BY 2
        `;

        // Tenant-wise daily aggregation.
        const tenantDaily = await tx.$executeRaw`
            INSERT INTO "TenantDailyRollup"
                ("tenantId", "bucketStart", "eventCount", "uniqueUsers", "updatedAt")
            SELECT
                ${tenantId},
                date_trunc('day', "occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
                COUNT(*)::bigint,
                COUNT(DISTINCT "distinctId")::bigint,
                NOW()
            FROM "Event"
            WHERE "tenantId" = ${tenantId}
            GROUP BY 2
        `;

        // Event-wise hourly aggregation.
        const eventHourly = await tx.$executeRaw`
            INSERT INTO "EventHourlyRollup"
                ("tenantId", "bucketStart", "eventName", "eventCount", "uniqueUsers", "updatedAt")
            SELECT
                ${tenantId},
                date_trunc('hour', "occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
                "eventName",
                COUNT(*)::bigint,
                COUNT(DISTINCT "distinctId")::bigint,
                NOW()
            FROM "Event"
            WHERE "tenantId" = ${tenantId}
            GROUP BY 2, 3
        `;

        // Event-wise daily aggregation.
        const eventDaily = await tx.$executeRaw`
            INSERT INTO "EventDailyRollup"
                ("tenantId", "bucketStart", "eventName", "eventCount", "uniqueUsers", "updatedAt")
            SELECT
                ${tenantId},
                date_trunc('day', "occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
                "eventName",
                COUNT(*)::bigint,
                COUNT(DISTINCT "distinctId")::bigint,
                NOW()
            FROM "Event"
            WHERE "tenantId" = ${tenantId}
            GROUP BY 2, 3
        `;

        return {
            tenantHourly,
            tenantDaily,
            eventHourly,
            eventDaily,
        };
    }, {
        maxWait: 10000,
        timeout: 600000,
    });
};

const main = async () => {
    try {
        const tenants = await adminDb.tenant.findMany({
            select: {
                id: true,
            },
        });

        console.log(`Found ${tenants.length} tenants.`);

        for (const tenant of tenants) {
            console.log(`Processing tenant: ${tenant.id}`);

            const result = await processTenantRollups(tenant.id);

            console.log("Rollups completed:", result);
        }

        console.log("All tenant rollups completed successfully.");
    } finally {
        await appDb.$disconnect();
        await adminDb.$disconnect();
    }
};

void main().catch((error) => {
    console.error("Rollup processing failed:", error);
    process.exitCode = 1;
});
