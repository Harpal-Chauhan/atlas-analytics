
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient();

const tenantId = "4396620c-fde5-4087-8b97-3874c61fdae6";

async function main() {
    console.log("Running 90-day DAU benchmark...");

    const result = await db.$queryRaw`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT
      "bucketStart"::date AS event_date,
      "uniqueUsers" AS daily_users
    FROM "TenantDailyRollup"
    WHERE
      "tenantId" = ${tenantId}
      AND "bucketStart" >= NOW() - INTERVAL '90 days'
    ORDER BY "bucketStart";
  `;

    console.log(result);
}

main()
    .catch(console.error)
    .finally(async () => {
        await db.$disconnect();
    });
