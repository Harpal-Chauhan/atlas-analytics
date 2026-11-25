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
      <section className="rounded-2xl border border-[#DCE8DD] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF9E9] text-[#8A6425]">
            !
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#142B27]">
              Organization unavailable
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#718078] sm:text-sm">
              Please sign in and select an organization to view retention data.
            </p>
          </div>
        </div>
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
      <section className="rounded-2xl border border-[#F3C8BC] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1EC] text-[#B85D46]">
            !
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#142B27]">
              Invalid date range
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#B85D46]">
              Please select a valid start date and end date.
            </p>
          </div>
        </div>
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
      <section className="rounded-2xl border border-[#F3C8BC] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1EC] text-[#B85D46]">
            !
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#142B27]">
              Unable to load retention analytics
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#B85D46] sm:text-sm">
              Something went wrong while loading retention data. Please try
              again later.
            </p>
          </div>
        </div>
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

  const getRetentionStyle = (rate: number) => {
    if (rate >= 75) {
      return "bg-[#D6F36A] text-[#142B27]";
    }

    if (rate >= 50) {
      return "bg-[#B9DDC8] text-[#176C52]";
    }

    if (rate >= 25) {
      return "bg-[#EAF3E9] text-[#176C52]";
    }

    return "bg-[#F0F3ED] text-[#718078]";
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#DCE8DD] bg-[#F8FAF4] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-[#176C52]">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-4 4" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-[#142B27] sm:text-lg">
                Weekly Retention
              </h3>

              <span className="rounded-full bg-[#EAF3E9] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#176C52]">
                COHORT ANALYTICS
              </span>
            </div>

            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#718078] sm:text-sm">
              Percentage of users returning in each week after their first
              active week.
            </p>
          </div>
        </div>

        <div className="w-full shrink-0 sm:w-auto">
          <CsvExportButton
            view="retention"
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Legend */}
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs font-semibold text-[#718078]">
            Retention Rate:
          </span>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#D6F36A]" />
            <span className="text-[11px] text-[#718078]">75%+</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#B9DDC8]" />
            <span className="text-[11px] text-[#718078]">50–74%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#EAF3E9]" />
            <span className="text-[11px] text-[#718078]">25–49%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#F0F3ED]" />
            <span className="text-[11px] text-[#718078]">Below 25%</span>
          </div>
        </div>

        {cohorts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#DCE8DD] bg-[#F8FAF4] px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF3E9] text-[#176C52]">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M7 14h.01M12 10h.01M17 6h.01" />
              </svg>
            </div>

            <h4 className="mt-3 text-sm font-bold text-[#142B27]">
              No retention data available
            </h4>

            <p className="mt-1 max-w-sm text-xs leading-5 text-[#829087] sm:text-sm">
              No retention cohort data is available for the selected date range.
              Try selecting a different date range.
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-[#DCE8DD]">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#F8FAF4] text-left">
                    <th className="sticky left-0 z-10 min-w-[145px] border-b border-[#DCE8DD] bg-[#F8FAF4] px-3 py-4 text-xs font-bold text-[#142B27] sm:px-4">
                      Cohort Week
                    </th>

                    <th className="min-w-[85px] border-b border-[#DCE8DD] px-3 py-4 text-right text-xs font-bold text-[#142B27]">
                      Users
                    </th>

                    {Array.from({ length: 12 }, (_, index) => (
                      <th
                        key={index}
                        className="min-w-[68px] border-b border-[#DCE8DD] px-2 py-4 text-center text-xs font-bold text-[#142B27]"
                      >
                        Week {index}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {cohorts.map((cohort, cohortIndex) => (
                    <tr
                      key={cohort.cohortWeek}
                      className="transition hover:bg-[#F8FAF4]"
                    >
                      <td className="sticky left-0 z-10 whitespace-nowrap border-b border-[#DCE8DD] bg-white px-3 py-3 text-xs font-semibold text-[#142B27] sm:px-4">
                        {formatDate(cohort.cohortWeek)}
                      </td>

                      <td className="border-b border-[#DCE8DD] px-3 py-3 text-right text-xs font-bold tabular-nums text-[#176C52]">
                        {cohort.cohortSize.toLocaleString("en-IN")}
                      </td>

                      {Array.from({ length: 12 }, (_, index) => {
                        const week = getRetention(cohort, index);

                        const weekStart = new Date(
                          `${cohort.cohortWeek}T00:00:00.000Z`,
                        );

                        weekStart.setUTCDate(
                          weekStart.getUTCDate() + index * 7,
                        );

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
                          <td
                            key={index}
                            className="border-b border-[#DCE8DD] px-2 py-3 text-center"
                          >
                            {isAvailable ? (
                              <span
                                title={`${week?.activeUsers ?? 0} active users`}
                                className={`inline-flex min-w-[52px] justify-center rounded-lg px-2 py-2 text-xs font-bold tabular-nums transition hover:scale-105 ${getRetentionStyle(rate)}`}
                              >
                                {rate.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-[#C5CEC5]">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#829087]">
                Showing {cohorts.length} retention cohorts.
              </p>

              <p className="text-xs text-[#829087]">
                Scroll horizontally to view all 12 weeks.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default RetentionHeatmap;
