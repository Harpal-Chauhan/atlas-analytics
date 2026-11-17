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

    const eventRollups = await tx.eventDailyRollup.findMany({
      where: {
        tenantId,
        bucketStart: {
          gte: selectedRange.startDate,
          lt: selectedRange.endDate,
        },
      },
      select: {
        eventName: true,
        eventCount: true,
      },
    });

    const eventBreakdown = new Map<string, bigint>();

    for (const item of eventRollups) {
      const current = eventBreakdown.get(item.eventName) ?? BigInt(0);

      eventBreakdown.set(item.eventName, current + item.eventCount);
    }

    return Array.from(eventBreakdown.entries())
      .map(([eventName, eventCount]) => ({
        eventName,
        eventCount,
      }))
      .sort((a, b) =>
        a.eventCount > b.eventCount ? -1 : a.eventCount < b.eventCount ? 1 : 0,
      )
      .slice(0, 5);
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Top Events</h3>

        <CsvExportButton
          view="top-events"
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      <p className="mt-1 text-sm text-gray-500">
        Most frequent events during the selected date range.
      </p>

      {topEvents.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No event data available yet.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {topEvents.map((item) => (
            <div
              key={item.eventName}
              className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0"
            >
              <span className="text-sm font-medium">{item.eventName}</span>

              <span className="text-sm text-gray-600">
                {formatNumber(item.eventCount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopEvents;
