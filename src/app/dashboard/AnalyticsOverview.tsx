import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const formatNumber = (value: bigint | number) =>
  Number(value).toLocaleString("en-IN");

const AnalyticsOverview = async () => {
  const session = await auth();
  const userId = session?.user?.id;
  const tenantId = session?.user?.activeTenantId;

  if (!userId || !tenantId) {
    return (
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Analytics Overview</h2>
        <p className="mt-2 text-sm text-gray-600">
          Select an active organization to view analytics.
        </p>
      </div>
    );
  }

  const analytics = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT set_config('app.user_id', ${userId}, true)
    `;

    await tx.$queryRaw`
      SELECT set_config('app.tenant_id', ${tenantId}, true)
    `;

    const membership = await tx.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      select: {
        tenantId: true,
      },
    });

    if (!membership) {
      return null;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const dailyRollups = await tx.tenantDailyRollup.findMany({
      where: {
        tenantId,
        bucketStart: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        bucketStart: "asc",
      },
      select: {
        eventCount: true,
        uniqueUsers: true,
      },
    });

    const hourlyRollups = await tx.tenantHourlyRollup.findMany({
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

    const eventRollups = await tx.eventDailyRollup.findMany({
      where: {
        tenantId,
        bucketStart: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        eventName: true,
        eventCount: true,
      },
    });

    const totalEvents = dailyRollups.reduce(
      (total, item) => total + item.eventCount,
      BigInt(0),
    );

    const latestDailyUsers =
      dailyRollups.length > 0
        ? dailyRollups[dailyRollups.length - 1]?.uniqueUsers ?? BigInt(0)
        : BigInt(0);

    const eventBreakdown = new Map<string, bigint>();

    for (const item of eventRollups) {
      const current = eventBreakdown.get(item.eventName) ?? BigInt(0);

      eventBreakdown.set(item.eventName, current + item.eventCount);
    }

    const topEvents = Array.from(eventBreakdown.entries())
      .map(([eventName, eventCount]) => ({
        eventName,
        eventCount,
      }))
      .sort((a, b) =>
        a.eventCount > b.eventCount ? -1 : a.eventCount < b.eventCount ? 1 : 0,
      )
      .slice(0, 5);

    return {
      totalEvents,
      latestDailyUsers,
      hourlyRollups,
      topEvents,
    };
  });

  if (!analytics) {
    return (
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-600">
          You do not have access to this organization.
        </p>
      </div>
    );
  }

  const maxHourlyEvents = Math.max(
    ...analytics.hourlyRollups.map((item) => Number(item.eventCount)),
    1,
  );

  return (
    <section className="mt-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Analytics Overview</h2>
        <p className="mt-1 text-sm text-gray-600">
          Analytics for the active organization.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Total Events (Last 30 Days)</p>
          <p className="mt-2 text-3xl font-bold">
            {formatNumber(analytics.totalEvents)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Latest Daily Unique Users</p>
          <p className="mt-2 text-3xl font-bold">
            {formatNumber(analytics.latestDailyUsers)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold">Hourly Event Activity</h3>
        <p className="mt-1 text-sm text-gray-500">
          Events recorded during the last 24 hours.
        </p>

        {analytics.hourlyRollups.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            No hourly activity available yet.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {analytics.hourlyRollups.map((item) => {
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

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold">Top Events</h3>
        <p className="mt-1 text-sm text-gray-500">
          Most frequent events during the last 30 days.
        </p>

        {analytics.topEvents.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            No event data available yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {analytics.topEvents.map((item) => (
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
    </section>
  );
};

export default AnalyticsOverview;
