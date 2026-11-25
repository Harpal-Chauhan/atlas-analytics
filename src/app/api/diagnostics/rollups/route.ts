import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;

    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 },
        );
    }

    const databaseUrl = process.env.DATABASE_URL;
    const appDatabaseUrl = process.env.APP_DATABASE_URL;

    const configuration = {
        databaseUrlConfigured: Boolean(databaseUrl),
        appDatabaseUrlConfigured: Boolean(appDatabaseUrl),
    };

    if (!databaseUrl || !appDatabaseUrl) {
        return NextResponse.json({
            success: false,
            configuration,
            error: "Required database configuration is missing.",
        }, { status: 500 });
    }

    const adminPool = new Pool({ connectionString: databaseUrl });
    const appPool = new Pool({ connectionString: appDatabaseUrl });

    const adminDb = new PrismaClient({
        adapter: new PrismaPg(adminPool),
    });

    const appDb = new PrismaClient({
        adapter: new PrismaPg(appPool),
    });

    try {
        const [tenantCount, eventCount, rollupCount] =
            await Promise.all([
                adminDb.tenant.count(),
                appDb.$queryRaw`SELECT COUNT(*)::text AS count FROM "Event"`,
                appDb.$queryRaw`SELECT COUNT(*)::text AS count FROM "TenantDailyRollup"`,
            ]);

        return NextResponse.json({
            success: true,
            configuration,
            checks: {
                adminDatabase: "connected",
                appDatabase: "connected",
                tenantCount,
                eventCount,
                dailyRollupCount: rollupCount,
            },
        });
    } catch (error) {
        console.error("Rollup diagnostic failed:", error);

        return NextResponse.json({
            success: false,
            configuration,
            error: "Database diagnostic failed. Check server logs.",
        }, { status: 500 });
    } finally {
        await Promise.all([
            adminDb.$disconnect(),
            appDb.$disconnect(),
        ]);
    }
}