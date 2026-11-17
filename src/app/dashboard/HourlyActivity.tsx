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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="font-semibold">Hourly Event Activity</h3>

      <p className="mt-1 text-sm text-gray-500">
        Events recorded during the last 24 hours.
      </p>

      {hourlyRollups.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No hourly activity available yet.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {hourlyRollups.map((item) => {
            const count = Number(item.eventCount);
            const width = Math.max((count / maxHourlyEvents) * 100, 1);

            return (
              <div
                key={item.bucketStart.toISOString()}
                className="grid grid-cols-[90px_1fr_55px] items-center gap-3"
              >
                <span className="text-xs text-gray-500">
                  {item.bucketStart.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata",
                  })}
                </span>

                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gray-700"
                    style={{ width: `${width}%` }}
                  />
                </div>

                <span className="text-right text-xs font-medium">
                  {formatNumber(item.eventCount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HourlyActivity;
