
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createRequestLogger } from "@/lib/request-logger";

export const dynamic = "force-dynamic";

const retentionQuerySchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type RetentionRow = {
    cohortWeek: Date;
    weekNumber: number;
    cohortSize: bigint;
    activeUsers: bigint;
};

export const GET = async (request: Request) => {
    const { requestId, log } = createRequestLogger(request);

    const respond = (body: object, status = 200) =>
        NextResponse.json(body, {
            status,
            headers: {
                "Cache-Control": "no-store",
                "X-Request-Id": requestId,
            },
        });

    log("info", "retention_analytics_started");

    try {
        const session = await auth();
        const userId = session?.user?.id;
        const tenantId = session?.user?.activeTenantId;

        if (!userId) {
            log("warn", "retention_analytics_unauthorized");

            return respond(
                { message: "Authentication required." },
                401,
            );
        }

        if (!tenantId) {
            log("warn", "retention_analytics_missing_tenant", {
                userId,
            });

            return respond(
                { message: "Select an organization first." },
                409,
            );
        }

        const searchParams = new URL(request.url).searchParams;

        const parsed = retentionQuerySchema.safeParse({
            startDate: searchParams.get("startDate"),
            endDate: searchParams.get("endDate"),
        });

        if (!parsed.success) {
            log("warn", "retention_analytics_invalid_parameters");

            return respond(
                { message: "Invalid date range." },
                400,
            );
        }

        const { startDate, endDate } = parsed.data;

        const startAt = new Date(`${startDate}T00:00:00.000Z`);
        const endExclusive = new Date(`${endDate}T00:00:00.000Z`);

        if (
            Number.isNaN(startAt.getTime()) ||
            Number.isNaN(endExclusive.getTime()) ||
            startAt.toISOString().slice(0, 10) !== startDate ||
            endExclusive.toISOString().slice(0, 10) !== endDate ||
            startDate > endDate
        ) {
            log("warn", "retention_analytics_invalid_date_range", {
                startDate,
                endDate,
            });

            return respond(
                { message: "Invalid date range." },
                400,
            );
        }

        endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

        const rows = await prisma.$withTenant(
            userId,
            tenantId,
            async (tx) => {
                return tx.$queryRaw<RetentionRow[]>`
                    WITH first_signup AS (
                        SELECT
                            "distinctId",
                            MIN("occurredAt") AS "signupAt"
                        FROM "Event"
                        WHERE
                            "tenantId" = ${tenantId}
                            AND "eventName" = 'Sign Up'
                        GROUP BY "distinctId"
                    ),

                    cohort_users AS (
                        SELECT
                            "distinctId",
                            "signupAt",
                            date_trunc(
                                'week',
                                "signupAt" AT TIME ZONE 'UTC'
                            ) AS "cohortWeek"
                        FROM first_signup
                        WHERE
                            "signupAt" >= ${startAt}
                            AND "signupAt" < ${endExclusive}
                    ),

                    cohort_sizes AS (
                        SELECT
                            "cohortWeek",
                            COUNT(*)::bigint AS "cohortSize"
                        FROM cohort_users
                        GROUP BY "cohortWeek"
                    ),

                    weekly_activity AS (
                        SELECT
                            cu."cohortWeek",
                            FLOOR(
                                EXTRACT(
                                    EPOCH FROM (
                                        date_trunc(
                                            'week',
                                            activity."occurredAt" AT TIME ZONE 'UTC'
                                        ) - cu."cohortWeek"
                                    )
                                ) / 604800
                            )::int AS "weekNumber",
                            COUNT(
                                DISTINCT cu."distinctId"
                            )::bigint AS "activeUsers"
                        FROM cohort_users cu
                        JOIN "Event" activity
                            ON activity."tenantId" = ${tenantId}
                            AND activity."distinctId" = cu."distinctId"
                            AND activity."occurredAt" >= cu."signupAt"
                            AND activity."occurredAt" < ${endExclusive}
                        GROUP BY cu."cohortWeek", 2
                    )

                    SELECT
                        wa."cohortWeek",
                        wa."weekNumber",
                        cs."cohortSize",
                        wa."activeUsers"
                    FROM weekly_activity wa
                    JOIN cohort_sizes cs
                        ON cs."cohortWeek" = wa."cohortWeek"
                    WHERE wa."weekNumber" BETWEEN 0 AND 11
                    ORDER BY
                        wa."cohortWeek" ASC,
                        wa."weekNumber" ASC
                `;
            },
        );

        const cohorts = new Map<
            string,
            {
                cohortWeek: string;
                cohortSize: number;
                weeks: {
                    weekNumber: number;
                    activeUsers: number;
                    retentionRate: number;
                }[];
            }
        >();

        for (const row of rows) {
            const key = row.cohortWeek.toISOString().slice(0, 10);
            const cohortSize = Number(row.cohortSize);
            const activeUsers = Number(row.activeUsers);

            if (!cohorts.has(key)) {
                cohorts.set(key, {
                    cohortWeek: key,
                    cohortSize,
                    weeks: [],
                });
            }

            cohorts.get(key)!.weeks.push({
                weekNumber: row.weekNumber,
                activeUsers,
                retentionRate:
                    cohortSize === 0
                        ? 0
                        : (activeUsers / cohortSize) * 100,
            });
        }

        const cohortResults = Array.from(cohorts.values());

        log("info", "retention_analytics_completed", {
            tenantId,
            cohortCount: cohortResults.length,
            rowCount: rows.length,
            startDate,
            endDate,
        });

        return respond({
            cohorts: cohortResults,
        });
    } catch (error) {
        log("error", "retention_analytics_failed", {
            error: error instanceof Error
                ? error.message
                : String(error),
        });

        return respond(
            { message: "Could not load retention analytics." },
            500,
        );
    }
};
