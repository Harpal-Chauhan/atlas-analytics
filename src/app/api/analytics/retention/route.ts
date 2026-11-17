
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.activeTenantId;

    if (!userId) {
        return NextResponse.json(
            { message: "Authentication required." },
            { status: 401 },
        );
    }

    if (!tenantId) {
        return NextResponse.json(
            { message: "Select an organization first." },
            { status: 409 },
        );
    }

    const searchParams = new URL(request.url).searchParams;

    const parsed = retentionQuerySchema.safeParse({
        startDate: searchParams.get("startDate"),
        endDate: searchParams.get("endDate"),
    });

    if (!parsed.success) {
        return NextResponse.json(
            { message: "Invalid date range." },
            { status: 400 },
        );
    }

    const { startDate, endDate } = parsed.data;

    const startAt = new Date(`${startDate}T00:00:00.000Z`);
    const endExclusive = new Date(`${endDate}T00:00:00.000Z`);

    if (
        startAt.toISOString().slice(0, 10) !== startDate ||
        endExclusive.toISOString().slice(0, 10) !== endDate ||
        startDate > endDate
    ) {
        return NextResponse.json(
            { message: "Invalid date range." },
            { status: 400 },
        );
    }

    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    try {
        const rows = await prisma.$withTenant(
            userId,
            tenantId,
            async (tx) => {
                return tx.$queryRaw<RetentionRow[]>`
          WITH first_activity AS (
            SELECT
              "distinctId",
              MIN("bucketStart") AS "firstActiveAt"
            FROM "TenantUserActivityDaily"
            WHERE "tenantId" = ${tenantId}
            GROUP BY "distinctId"
          ),

          cohort_users AS (
            SELECT
              "distinctId",
              date_trunc(
                'week',
                "firstActiveAt" AT TIME ZONE 'UTC'
              ) AS "cohortWeek"
            FROM first_activity
            WHERE "firstActiveAt" >= ${startAt}
              AND "firstActiveAt" < ${endExclusive}
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
                      activity."bucketStart" AT TIME ZONE 'UTC'
                    ) - cu."cohortWeek"
                  )
                ) / 604800
              )::int AS "weekNumber",
              COUNT(DISTINCT cu."distinctId")::bigint AS "activeUsers"
            FROM cohort_users cu
            JOIN "TenantUserActivityDaily" activity
              ON activity."tenantId" = ${tenantId}
              AND activity."distinctId" = cu."distinctId"
              AND activity."bucketStart" >= (
                cu."cohortWeek" AT TIME ZONE 'UTC'
              )
              AND activity."bucketStart" < ${endExclusive}
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
          ORDER BY wa."cohortWeek" ASC, wa."weekNumber" ASC
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
                    cohortSize === 0 ? 0 : (activeUsers / cohortSize) * 100,
            });
        }

        return NextResponse.json(
            {
                cohorts: Array.from(cohorts.values()),
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch (error) {
        console.error("Retention analytics error:", error);

        return NextResponse.json(
            { message: "Could not load retention analytics." },
            { status: 500 },
        );
    }
};
