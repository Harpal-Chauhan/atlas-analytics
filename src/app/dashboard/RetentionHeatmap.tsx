import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CsvExportButton } from "./CsvExportButton";
import {
  buildRetentionCohorts,
  type RetentionCohort,
  type RetentionRow,
} from "@/lib/retention";

type RetentionHeatmapProps = {
  startDate: string;
  endDate: string;
};

const RetentionHeatmap = async ({
  startDate,
  endDate,
}: RetentionHeatmapProps) => {
  const session = await auth();
  const userId = session?.user?.id;
  const tenantId = session?.user?.activeTenantId;

  if (!userId || !tenantId) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">
          Please sign in and select an organization to view retention data.
        </p>
      </section>
    );
  }

  const startAt = new Date(`${startDate}T00:00:00.000Z`);
  const endExclusive = new Date(`${endDate}T00:00:00.000Z`);

  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endExclusive.getTime()) ||
    startAt.toISOString().slice(0, 10) !== startDate ||
    endExclusive.toISOString().slice(0, 10) !== endDate ||
    startDate > endDate
  ) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-red-600">Invalid date range.</p>
      </section>
    );
  }

  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  let cohorts: RetentionCohort[];

  try {
    const rows = await prisma.$withTenant(userId, tenantId, async (tx) => {
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

activity_weeks AS (
  SELECT DISTINCT
    cu."cohortWeek",
    activity."distinctId",
    date_trunc(
      'week',
      activity."bucketStart" AT TIME ZONE 'UTC'
    ) AS "activityWeek"
  FROM "TenantUserActivityDaily" activity
  JOIN cohort_users cu
    ON cu."distinctId" = activity."distinctId"
  WHERE
    activity."tenantId" = ${tenantId}
    AND activity."bucketStart" >=
      date_trunc('day', cu."signupAt" AT TIME ZONE 'UTC')
      AT TIME ZONE 'UTC'
    AND activity."bucketStart" < ${endExclusive}
),

weekly_activity AS (
  SELECT
    aw."cohortWeek",
    (
      (aw."activityWeek"::date - aw."cohortWeek"::date) / 7
    )::int AS "weekNumber",
    COUNT(*)::bigint AS "activeUsers"
  FROM activity_weeks aw
  WHERE
    aw."activityWeek" >= aw."cohortWeek"
    AND aw."activityWeek" < aw."cohortWeek" + INTERVAL '84 days'
  GROUP BY
    aw."cohortWeek",
    2
)

          SELECT
            to_char(wa."cohortWeek", 'YYYY-MM-DD') AS "cohortWeek",
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
    });

    cohorts = buildRetentionCohorts(rows);
  } catch (error) {
    console.error("Retention analytics error:", error);

    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-red-600">
          Could not load retention analytics.
        </p>
      </section>
    );
  }

  const getRetention = (cohort: RetentionCohort, weekNumber: number) => {
    return cohort.weeks.find((week) => week.weekNumber === weekNumber);
  };

  const formatDate = (value: string) => {
    return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Weekly Retention</h3>
          <p className="mt-1 text-sm text-gray-500">
            Percentage of users returning in each week after their first active
            week.
          </p>
        </div>

        <CsvExportButton
          view="retention"
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      {cohorts.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          No retention cohort data available for this date range.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-3 py-3 font-medium">Cohort Week</th>
                <th className="px-3 py-3 text-right font-medium">Users</th>

                {Array.from({ length: 12 }, (_, index) => (
                  <th key={index} className="px-3 py-3 text-center font-medium">
                    Week {index}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {cohorts.map((cohort) => (
                <tr
                  key={cohort.cohortWeek}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDate(cohort.cohortWeek)}
                  </td>

                  <td className="px-3 py-3 text-right font-medium">
                    {cohort.cohortSize.toLocaleString("en-IN")}
                  </td>

                  {Array.from({ length: 12 }, (_, index) => {
                    const week = getRetention(cohort, index);

                    const weekStart = new Date(
                      `${cohort.cohortWeek}T00:00:00.000Z`,
                    );

                    weekStart.setUTCDate(weekStart.getUTCDate() + index * 7);

                    const weekEndExclusive = new Date(weekStart);
                    weekEndExclusive.setUTCDate(
                      weekEndExclusive.getUTCDate() + 7,
                    );

                    const selectedEndExclusive = new Date(
                      `${endDate}T00:00:00.000Z`,
                    );
                    selectedEndExclusive.setUTCDate(
                      selectedEndExclusive.getUTCDate() + 1,
                    );

                    const isAvailable =
                      weekEndExclusive <= selectedEndExclusive;

                    const rate = week?.retentionRate ?? 0;

                    return (
                      <td key={index} className="px-2 py-3 text-center">
                        {isAvailable ? (
                          <span
                            title={`${week?.activeUsers ?? 0} active users`}
                            className="inline-flex min-w-12 justify-center rounded-md px-2 py-2 font-medium"
                            style={{
                              backgroundColor:
                                rate >= 75
                                  ? "#d1fae5"
                                  : rate >= 50
                                    ? "#a7f3d0"
                                    : rate >= 25
                                      ? "#dbeafe"
                                      : "#f3f4f6",
                              color: "#1f2937",
                            }}
                          >
                            {rate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default RetentionHeatmap;
