import "dotenv/config";
import { Pool } from "pg";

async function main() {
    const admin = new Pool({ connectionString: process.env.DATABASE_URL });
    const app = new Pool({ connectionString: process.env.APP_DATABASE_URL });

    try {
        const tenants = await admin.query('SELECT id FROM "Tenant"');

        console.log(`Tenants found: ${tenants.rowCount}`);

        for (const tenant of tenants.rows) {
            const client = await app.connect();

            try {
                await client.query("BEGIN");

                await client.query(
                    "SELECT set_config('app.tenant_id', $1, true)",
                    [tenant.id]
                );

                const result = await client.query(`
                    SELECT
                        COUNT(*) AS visible_events,
                        COUNT(*) FILTER (
                            WHERE "tenantId" <> $1
                        ) AS cross_tenant_events
                    FROM "Event"
                `, [tenant.id]);

                console.log({
                    visible_events: result.rows[0].visible_events,
                    cross_tenant_events: result.rows[0].cross_tenant_events,
                });

                await client.query("ROLLBACK");
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            } finally {
                client.release();
            }
        }
    } finally {
        await admin.end();
        await app.end();
    }
}

main().catch(console.error);
