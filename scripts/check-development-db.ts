import "dotenv/config";
import { Pool } from "pg";

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const result = await pool.query(`
            SELECT
                current_database() AS database,
                current_user AS role,
                (SELECT COUNT(*) FROM "Tenant") AS tenants,
                (SELECT COUNT(*) FROM "Event") AS events,
                (SELECT COUNT(*) FROM "ApiKey") AS api_keys,
                (SELECT COUNT(*) FROM "Membership") AS memberships
        `);

        console.table(result.rows);
    } finally {
        await pool.end();
    }
}

main().catch(console.error);
