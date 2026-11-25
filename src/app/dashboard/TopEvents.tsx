import { withTenant } from "@/lib/tenant-db";
import { formatNumber, getDateRange } from "./analytics-utils";
import { CsvExportButton } from "./CsvExportButton";

type TopEventsProps = {
  userId: string;
  tenantId: string;
  startDate?: string;
  endDate?: string;
};

const TopEvents = async ({
  userId,
  tenantId,
  startDate,
  endDate,
}: TopEventsProps) => {
  const topEvents = await withTenant(userId, tenantId, async (tx) => {
    const selectedRange = getDateRange(startDate, endDate);

    const eventBreakdown = await tx.eventDailyRollup.groupBy({
      by: ["eventName"],
      where: {
        tenantId,
        bucketStart: {
          gte: selectedRange.startDate,
          lt: selectedRange.endDate,
        },
      },
      _sum: {
        eventCount: true,
      },
      orderBy: {
        _sum: {
          eventCount: "desc",
        },
      },
      take: 5,
    });

    return eventBreakdown.map((item) => ({
      eventName: item.eventName,
      eventCount: item._sum.eventCount ?? BigInt(0),
    }));
  });

  return (
    <section className="h-full overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
      {/* HEADER */}

      <div className="flex flex-col gap-4 border-b border-[#E8EEE7] bg-[#F8FAF4] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E5F2E9] text-[#176C52]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-5 5" />
            </svg>
          </div>

          <div>
            <h3 className="text-base font-bold tracking-tight text-[#142B27] sm:text-lg">
              Top Events
            </h3>

            <p className="mt-1 text-xs leading-5 text-[#718078] sm:text-sm">
              Most frequent events during the selected date range.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="rounded-full border border-[#D5E8D8] bg-white px-3 py-1 text-[11px] font-semibold text-[#176C52]">
            TOP 5
          </span>

          <CsvExportButton
            view="top-events"
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>

      {/* EVENT LIST */}

      <div className="p-5 sm:p-6">
        {topEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#DCE8DD] bg-[#FAFBF7] px-4 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF3E9] text-[#176C52]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
            </div>

            <h4 className="text-sm font-bold text-[#142B27]">
              No events available
            </h4>

            <p className="mt-1 max-w-xs text-xs leading-5 text-[#718078]">
              Event activity will appear here when data is available for this
              reporting period.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topEvents.map((item, index) => (
              <div
                key={item.eventName}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#EDF1EB] bg-white p-3 transition-all duration-200 hover:border-[#B9DCC7] hover:bg-[#F8FAF4] sm:gap-4 sm:p-4"
              >
                {/* RANK */}

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    index === 0
                      ? "bg-[#D6F36A] text-[#142B27]"
                      : "bg-[#EAF3E9] text-[#176C52]"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                {/* EVENT NAME */}

                <div className="min-w-0 flex-1">
                  <p
                    className="break-words text-sm font-semibold text-[#263B32] transition-colors group-hover:text-[#176C52]"
                    title={item.eventName}
                  >
                    {item.eventName}
                  </p>

                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[#93A198]">
                    Event {index + 1}
                  </p>
                </div>

                {/* EVENT COUNT */}

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-[#176C52] sm:text-base">
                    {formatNumber(item.eventCount)}
                  </p>

                  <p className="mt-1 text-[10px] font-medium text-[#93A198]">
                    Events
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}

      {topEvents.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[#E8EEE7] bg-[#FAFBF7] px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] text-[#829087]">
            Showing {topEvents.length} most frequent events
          </p>

          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#176C52]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#20B58A]" />
            Rollup Data
          </span>
        </div>
      )}
    </section>
  );
};

export default TopEvents;
