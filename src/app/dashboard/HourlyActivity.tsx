import { withTenant } from "@/lib/tenant-db";
import { formatNumber } from "./analytics-utils";

type HourlyActivityProps = {
  userId: string;
  tenantId: string;
};

const HourlyActivity = async ({ userId, tenantId }: HourlyActivityProps) => {
  const hourlyRollups = await withTenant(userId, tenantId, async (tx) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return tx.tenantHourlyRollup.findMany({
      where: {
        tenantId,
        bucketStart: {
          gte: twentyFourHoursAgo,
        },
      },
      orderBy: {
        bucketStart: "asc",
      },
      select: {
        bucketStart: true,
        eventCount: true,
      },
    });
  });

  const maxHourlyEvents = Math.max(
    ...hourlyRollups.map((item) => Number(item.eventCount)),
    1,
  );

  const totalEvents = hourlyRollups.reduce(
    (total, item) => total + Number(item.eventCount),
    0,
  );

  const peakHour = hourlyRollups.reduce<(typeof hourlyRollups)[number] | null>(
    (peak, item) => {
      if (!peak || Number(item.eventCount) > Number(peak.eventCount)) {
        return item;
      }

      return peak;
    },
    null,
  );

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#DCE8DD] bg-[#F8FAF4] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-[#176C52]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12h4l3-9 4 18 3-9h4" />
            </svg>
          </div>

          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#142B27] sm:text-lg">
              Hourly Event Activity
            </h3>

            <p className="mt-1 text-xs text-[#718078] sm:text-sm">
              Events recorded during the last 24 hours.
            </p>
          </div>
        </div>

        <span className="w-fit rounded-full border border-[#DCE8DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#176C52]">
          Last 24 Hours
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {hourlyRollups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#DCE8DD] bg-[#F8FAF4] px-4 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF3E9] text-[#176C52]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>

            <h4 className="mt-3 text-sm font-bold text-[#142B27]">
              No Hourly Activity Yet
            </h4>

            <p className="mt-1 text-sm text-[#829087]">
              Event activity will appear here when data is available.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-4">
                <p className="text-xs font-semibold text-[#718078]">
                  TOTAL EVENTS
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-[#142B27]">
                  {formatNumber(totalEvents)}
                </p>

                <p className="mt-1 text-xs text-[#829087]">
                  Recorded in available hourly buckets
                </p>
              </div>

              <div className="rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-4">
                <p className="text-xs font-semibold text-[#718078]">
                  PEAK HOUR
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-[#176C52]">
                  {peakHour
                    ? peakHour.bucketStart.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      })
                    : "—"}
                </p>

                <p className="mt-1 text-xs text-[#829087]">
                  {peakHour
                    ? `${formatNumber(peakHour.eventCount)} events`
                    : "No peak activity"}
                </p>
              </div>
            </div>

            {/* Chart Heading */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-[#142B27]">
                  Activity Breakdown
                </h4>

                <p className="mt-1 text-xs text-[#829087]">
                  Event volume by hour
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#20B58A]" />
                <span className="text-xs font-medium text-[#718078]">
                  Events
                </span>
              </div>
            </div>

            {/* Hourly Bars */}
            <div className="space-y-4">
              {hourlyRollups.map((item) => {
                const count = Number(item.eventCount);

                const width = Math.max((count / maxHourlyEvents) * 100, 1);

                const isPeak = count === maxHourlyEvents;

                return (
                  <div
                    key={item.bucketStart.toISOString()}
                    className="grid min-w-0 grid-cols-[65px_minmax(0,1fr)_65px] items-center gap-2 sm:grid-cols-[80px_minmax(0,1fr)_75px] sm:gap-4"
                  >
                    <span className="whitespace-nowrap text-xs font-medium text-[#718078]">
                      {item.bucketStart.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      })}
                    </span>

                    <div className="h-3 overflow-hidden rounded-full bg-[#EAF3E9]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPeak ? "bg-[#176C52]" : "bg-[#20B58A]"
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>

                    <span
                      className={`truncate text-right text-xs font-bold tabular-nums ${
                        isPeak ? "text-[#176C52]" : "text-[#142B27]"
                      }`}
                    >
                      {formatNumber(item.eventCount)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#DCE8DD] pt-4">
              <span className="text-xs text-[#829087]">
                Peak activity is highlighted in dark green.
              </span>

              <span className="rounded-lg bg-[#EAF3E9] px-3 py-1.5 text-xs font-semibold text-[#176C52]">
                {hourlyRollups.length} Buckets
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default HourlyActivity;
