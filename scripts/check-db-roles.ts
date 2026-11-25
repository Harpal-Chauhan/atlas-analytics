import "dotenv/config";
import { Pool } from "pg";

async function main() {
    for (const [label, url] of [
        ["DATABASE_URL", process.env.DATABASE_URL],
        ["APP_DATABASE_URL", process.env.APP_DATABASE_URL],
    ]) {
        if (!url) throw new Error(`${label} is missing`);

        const pool = new Pool({ connectionString: url });

        try {
            const result = await pool.query(
                "SELECT current_user AS role, current_database() AS database"
            );
            console.log(label, result.rows[0]);
        } finally {
            await pool.end();
        }
    }
}

main().catch(console.error);
