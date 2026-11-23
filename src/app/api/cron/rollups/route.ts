
import { NextResponse } from "next/server";
import {
    processAllTenantRollups,
    disconnectRollupClients,
} from "../../../../../scripts/process-rollups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json(
            { error: "Cron secret is not configured." },
            { status: 500 },
        );
    }

    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
            { error: "Unauthorized." },
            { status: 401 },
        );
    }

    try {
        const result = await processAllTenantRollups();

        return NextResponse.json({
            success: true,
            message: "All tenant rollups completed successfully.",
            ...result,
        });
    } catch (error) {
        console.error("Cron rollup processing failed:", error);

        return NextResponse.json(
            { error: "Rollup processing failed." },
            { status: 500 },
        );
    } finally {
        await disconnectRollupClients();
    }
}
