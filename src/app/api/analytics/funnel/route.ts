import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const funnelQuerySchema = z.object({
    steps: z
        .array(z.string().trim().min(1).max(100))
        .min(2)
        .max(6)
        .refine((steps) => new Set(steps).size === steps.length, {
            message: "Funnel steps must be unique.",
        }),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    conversionWindowDays: z.coerce.number().int().min(1).max(30).default(7),
});

type FunnelCountRow = {
    stepNumber: number;
    reachedUsers: bigint;
};

export const GET = async (request: Request) => {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.activeTenantId;

    if (!userId) {
        return NextResponse.json(
            { message: "Please log in first." },
            { status: 401 },
        );
    }

    if (!tenantId) {
        return NextResponse.json(
            { message: "Please select an active organization." },
            { status: 409 },
        );
    }

    const searchParams = new URL(request.url).searchParams;

    const parsed = funnelQuerySchema.safeParse({
        steps: searchParams.getAll("step"),
        startDate: searchParams.get("startDate"),
        endDate: searchParams.get("endDate"),
        conversionWindowDays: searchParams.get("conversionWindowDays") ?? "7",
    });

    if (!parsed.success) {
        return NextResponse.json(
            {
                message: "Invalid funnel parameters.",
                errors: parsed.error.flatten(),
            },
            { status: 400 },
        );
    }

    const {
        steps,
        startDate,
        endDate,
        conversionWindowDays,
    } = parsed.data;

    const startAt = new Date(`${startDate}T00:00:00.000Z`);
    const endExclusive = new Date(`${endDate}T00:00:00.000Z`);

    if (
        Number.isNaN(startAt.getTime()) ||
        Number.isNaN(endExclusive.getTime()) ||
        startAt.toISOString().slice(0, 10) !== startDate ||
        endExclusive.toISOString().slice(0, 10) !== endDate ||
        startAt > endExclusive
    ) {
        return NextResponse.json(
            { message: "Invalid date range." },
            { status: 400 },
        );
    }

    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const requestedSteps = Prisma.join(
        steps.map((eventName, index) =>
            Prisma.sql`(${index + 1}, ${eventName})`,
        ),
    );

    try {
        const result = await prisma.$withTenant(
            userId,
            tenantId,
            async (tx) => {
                const rows = await tx.$queryRaw<FunnelCountRow[]>(Prisma.sql`
          WITH RECURSIVE requested_steps("stepNumber", "eventName") AS (
            VALUES ${requestedSteps}
          ),

          first_step_events AS (
            SELECT
              e."distinctId",
              MIN(e."occurredAt") AS "cohortAt"
            FROM "Event" e
            WHERE
              e."tenantId" = ${tenantId}
              AND e."eventName" = ${steps[0]}
              AND e."occurredAt" >= ${startAt}
              AND e."occurredAt" < ${endExclusive}
            GROUP BY e."distinctId"
          ),

          funnel_progress AS (
            SELECT
              f."distinctId",
              1::int AS "stepNumber",
              f."cohortAt" AS "stepAt",
              f."cohortAt"
            FROM first_step_events f

            UNION ALL

            SELECT
                fp."distinctId",
                rs."stepNumber"::int,
                next_event."occurredAt",
                fp."cohortAt"
            FROM funnel_progress fp

            JOIN requested_steps rs
              ON rs."stepNumber" = fp."stepNumber" + 1

            CROSS JOIN LATERAL (
              SELECT e."occurredAt"
              FROM "Event" e
              WHERE
                e."tenantId" = ${tenantId}
                AND e."distinctId" = fp."distinctId"
                AND e."eventName" = rs."eventName"
                AND e."occurredAt" > fp."stepAt"
                AND e."occurredAt" <=
                  fp."cohortAt" + (${conversionWindowDays} * INTERVAL '1 day')
              ORDER BY e."occurredAt" ASC
              LIMIT 1
            ) next_event
          ),

          step_counts AS (
            SELECT
              "stepNumber",
              COUNT(*)::bigint AS "reachedUsers"
            FROM funnel_progress
            GROUP BY "stepNumber"
          )

          SELECT
            rs."stepNumber",
            COALESCE(sc."reachedUsers", 0)::bigint AS "reachedUsers"
          FROM requested_steps rs
          LEFT JOIN step_counts sc
            ON sc."stepNumber" = rs."stepNumber"
          ORDER BY rs."stepNumber"
        `);

                return rows;
            },
        );

        const counts = result.map((row) => Number(row.reachedUsers));
        const totalUsers = counts[0] ?? 0;

        const funnelSteps = steps.map((eventName, index) => {
            const reachedUsers = counts[index] ?? 0;
            const previousCount =
                index === 0 ? totalUsers : counts[index - 1] ?? 0;

            return {
                eventName,
                reachedUsers,
                conversionRate:
                    previousCount === 0
                        ? 0
                        : (reachedUsers / previousCount) * 100,
                dropOff: previousCount - reachedUsers,
            };
        });

        return NextResponse.json(
            {
                totalUsers,
                conversionWindowDays,
                steps: funnelSteps,
            },
            {
                headers: { "Cache-Control": "no-store" },
            },
        );
    } catch (error) {
        console.error("Funnel analytics error:", error);

        return NextResponse.json(
            { message: "Could not load funnel analytics." },
            { status: 500 },
        );
    }
};