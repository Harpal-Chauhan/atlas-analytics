
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createRequestLogger } from "@/lib/request-logger";

export const dynamic = "force-dynamic";

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
    const { requestId, log } = createRequestLogger(request);

    const respond = (
        body: object,
        status = 200,
    ) =>
        NextResponse.json(body, {
            status,
            headers: {
                "Cache-Control": "no-store",
                "X-Request-Id": requestId,
            },
        });

    log("info", "funnel_analytics_started");

    try {
        const session = await auth();
        const userId = session?.user?.id;
        const tenantId = session?.user?.activeTenantId;

        if (!userId) {
            log("warn", "funnel_analytics_unauthorized");

            return respond(
                { message: "Please log in first." },
                401,
            );
        }

        if (!tenantId) {
            log("warn", "funnel_analytics_missing_tenant", {
                userId,
            });

            return respond(
                { message: "Please select an active organization." },
                409,
            );
        }

        const searchParams = new URL(request.url).searchParams;

        const parsed = funnelQuerySchema.safeParse({
            steps: searchParams.getAll("step"),
            startDate: searchParams.get("startDate"),
            endDate: searchParams.get("endDate"),
            conversionWindowDays:
                searchParams.get("conversionWindowDays") ?? "7",
        });

        if (!parsed.success) {
            log("warn", "funnel_analytics_invalid_parameters", {
                issues: parsed.error.issues.length,
            });

            return respond(
                {
                    message: "Invalid funnel parameters.",
                    errors: parsed.error.flatten(),
                },
                400,
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
            log("warn", "funnel_analytics_invalid_date_range", {
                startDate,
                endDate,
            });

            return respond(
                { message: "Invalid date range." },
                400,
            );
        }

        endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

        const requestedSteps = Prisma.join(
            steps.map((eventName, index) =>
                Prisma.sql`(${index + 1}::int, ${eventName}::text)`,
            ),
        );

        const result = await prisma.$withTenant(
            userId,
            tenantId,
            async (tx) => {
                const rows = await tx.$queryRaw<FunnelCountRow[]>(
                    Prisma.sql`
                        WITH RECURSIVE requested_steps(
                            "stepNumber",
                            "eventName"
                        ) AS (
                            VALUES ${requestedSteps}
                        ),

                        first_step_users AS (
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

                        funnel_progress (
                            "distinctId",
                            "stepNumber",
                            "stepAt",
                            "cohortAt"
                        ) AS (
                            SELECT
                                fsu."distinctId",
                                1::int,
                                fsu."cohortAt",
                                fsu."cohortAt"
                            FROM first_step_users fsu

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
                                        fp."cohortAt" +
                                        (${conversionWindowDays} * INTERVAL '1 day')
                                ORDER BY e."occurredAt" ASC
                                LIMIT 1
                            ) next_event
                        )

                        SELECT
                            rs."stepNumber",
                            COUNT(fp."distinctId")::bigint AS "reachedUsers"
                        FROM requested_steps rs
                        LEFT JOIN funnel_progress fp
                            ON fp."stepNumber" = rs."stepNumber"
                        GROUP BY rs."stepNumber"
                        ORDER BY rs."stepNumber"
                    `,
                );

                return rows;
            },
        );

        const counts = result.map((row) =>
            Number(row.reachedUsers)
        );

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

        log("info", "funnel_analytics_completed", {
            tenantId,
            stepCount: steps.length,
            totalUsers,
            conversionWindowDays,
        });

        return respond({
            totalUsers,
            conversionWindowDays,
            steps: funnelSteps,
        });
    } catch (error) {
        log("error", "funnel_analytics_failed", {
            error: error instanceof Error
                ? error.message
                : String(error),
        });

        return respond(
            { message: "Could not load funnel analytics." },
            500,
        );
    }
};
