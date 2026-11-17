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
        eventCount: true,
      },
    });

    const activityMetrics = await tx.$queryRaw<
      { dau: bigint; wau: bigint; mau: bigint }[]
    >`
      SELECT
        COUNT(DISTINCT "distinctId")
          FILTER (
            WHERE "bucketStart" = ${selectedEndDate}
          )::bigint AS "dau",

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

    const activeUsers = activityMetrics[0] ?? {
      dau: BigInt(0),
      wau: BigInt(0),
      mau: BigInt(0),
    };

    return {
      totalEvents,
      dau: activeUsers.dau,
      wau: activeUsers.wau,
      mau: activeUsers.mau,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CsvExportButton
          view="overview"
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Total Events (Selected Range)</p>
          <p className="mt-2 text-3xl font-bold">
            {formatNumber(analytics.totalEvents)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">DAU (Selected End Date)</p>
          <p className="mt-2 text-3xl font-bold">
            {formatNumber(analytics.dau)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">WAU (7 Days)</p>
          <p className="mt-2 text-3xl font-bold">
            {formatNumber(analytics.wau)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">MAU (30 Days)</p>
          <p className="mt-2 text-3xl font-bold">
            {formatNumber(analytics.mau)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverviewStats;
