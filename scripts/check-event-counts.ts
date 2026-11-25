import "dotenv/config";
import { Pool } from "pg";

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const result = await pool.query(`
            SELECT
                "tenantId",
                COUNT(*)::bigint AS event_count
            FROM "Event"
            GROUP BY "tenantId"
            ORDER BY "tenantId"
        `);

        console.table(result.rows);
    } finally {
        await pool.end();
    }
}

main().catch(console.error);
