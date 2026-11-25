import { withTenant } from "@/lib/tenant-db";
import { formatNumber, getDateRange } from "./analytics-utils";
import { CsvExportButton } from "./CsvExportButton";

type OverviewStatsProps = {
  userId: string;
  tenantId: string;
  startDate?: string;
  endDate?: string;
};

const OverviewStats = async ({
  userId,
  tenantId,
  startDate,
  endDate,
}: OverviewStatsProps) => {
  const analytics = await withTenant(userId, tenantId, async (tx) => {
    const selectedRange = getDateRange(startDate, endDate);

    const selectedEndDate = new Date(selectedRange.endDate);
    selectedEndDate.setUTCDate(selectedEndDate.getUTCDate() - 1);

    const weekStart = new Date(selectedEndDate);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);

    const monthStart = new Date(selectedEndDate);
    monthStart.setUTCDate(monthStart.getUTCDate() - 29);

    const activityEndExclusive = new Date(selectedEndDate);
    activityEndExclusive.setUTCDate(activityEndExclusive.getUTCDate() + 1);

    const dailyRollups = await tx.tenantDailyRollup.findMany({
      where: {
        tenantId,
        bucketStart: {
          gte: selectedRange.startDate,
          lt: selectedRange.endDate,
        },
      },
      select: {
        bucketStart: true,
        eventCount: true,
        uniqueUsers: true,
      },
    });

    const activityMetrics = await tx.$queryRaw<{ wau: bigint; mau: bigint }[]>`
      SELECT
        COUNT(DISTINCT "distinctId")
          FILTER (
            WHERE "bucketStart" >= ${weekStart}
          )::bigint AS "wau",

        COUNT(DISTINCT "distinctId")::bigint AS "mau"

      FROM "TenantUserActivityDaily"

      WHERE "tenantId" = ${tenantId}
        AND "bucketStart" >= ${monthStart}
        AND "bucketStart" < ${activityEndExclusive}
    `;

    const totalEvents = dailyRollups.reduce(
      (total, item) => total + item.eventCount,
      BigInt(0),
    );

    const selectedDayRollup = dailyRollups.find(
      (item) => item.bucketStart.getTime() === selectedEndDate.getTime(),
    );

    const activeUsers = activityMetrics[0] ?? {
      wau: BigInt(0),
      mau: BigInt(0),
    };

    return {
      totalEvents,
      dau: selectedDayRollup?.uniqueUsers ?? BigInt(0),
      wau: activeUsers.wau,
      mau: activeUsers.mau,
    };
  });

  const stats = [
    {
      label: "Total Events",
      subtitle: "Selected date range",
      value: analytics.totalEvents,
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12h4l3-8 4 16 3-8h4" />
        </svg>
      ),
      iconBg: "bg-[#EAF3E9]",
      iconColor: "text-[#176C52]",
      accent: "bg-[#20B58A]",
    },
    {
      label: "Daily Active Users",
      subtitle: "Selected end date",
      value: analytics.dau,
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M20 8v6M23 11h-6" />
        </svg>
      ),
      iconBg: "bg-[#F0F5D9]",
      iconColor: "text-[#718A29]",
      accent: "bg-[#D6F36A]",
    },
    {
      label: "Weekly Active Users",
      subtitle: "Last 7 days",
      value: analytics.wau,
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      ),
      iconBg: "bg-[#FFF1EC]",
      iconColor: "text-[#B85D46]",
      accent: "bg-[#FF896D]",
    },
    {
      label: "Monthly Active Users",
      subtitle: "Last 30 days",
      value: analytics.mau,
      icon: (
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
      ),
      iconBg: "bg-[#EAF3E9]",
      iconColor: "text-[#176C52]",
      accent: "bg-[#20B58A]",
    },
  ];

  return (
    <div className="min-w-0 space-y-4">
      {/* Section heading and export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[#142B27] sm:text-lg">
            Key Performance Metrics
          </h2>
          <p className="mt-1 text-xs text-[#718078] sm:text-sm">
            {"Track your organization's engagement and event performance."}
          </p>
        </div>

        <div className="w-full shrink-0 sm:w-auto">
          <CsvExportButton
            view="overview"
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>

      {/* Statistics cards */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative min-w-0 overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#B9DDC8] hover:shadow-md sm:p-5"
          >
            {/* Accent line */}
            <div
              className={`absolute left-0 top-0 h-1 w-full ${stat.accent}`}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-5 text-[#718078] sm:text-sm">
                  {stat.label}
                </p>

                <p className="mt-1 text-[11px] text-[#829087]">
                  {stat.subtitle}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}
              >
                {stat.icon}
              </div>
            </div>

            <div className="mt-5">
              <p className="break-words text-3xl font-bold tracking-tight text-[#142B27] sm:text-4xl">
                {formatNumber(stat.value)}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#DCE8DD] pt-3">
              <span className="text-[11px] font-medium text-[#829087]">
                Analytics Metric
              </span>

              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#176C52]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#20B58A]" />
                Tracked
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OverviewStats;
