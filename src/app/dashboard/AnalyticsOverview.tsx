import { Suspense } from "react";
import { auth } from "@/auth";
import { getDateRange } from "./analytics-utils";

import OverviewStats from "./OverviewStats";
import TopEvents from "./TopEvents";
import FunnelSection from "./FunnelSection";
import RetentionHeatmap from "./RetentionHeatmap";
import LiveActivity from "./LiveActivity";
import { withTenant } from "@/lib/tenant-db";

type AnalyticsOverviewProps = {
  startDate?: string;
  endDate?: string;
};

const AnalyticsOverview = async ({
  startDate,
  endDate,
}: AnalyticsOverviewProps) => {
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

  const selectedRange = getDateRange(startDate, endDate);

  const selectedEndDate = new Date(selectedRange.endDate);
  selectedEndDate.setUTCDate(selectedEndDate.getUTCDate() - 1);

  const formattedStartDate = selectedRange.startDate.toISOString().slice(0, 10);
  const formattedEndDate = selectedEndDate.toISOString().slice(0, 10);

  let hasAccess = false;

  try {
    await withTenant(userId, tenantId, async () => true);
    hasAccess = true;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "You do not have access to this organization." ||
        error.message === "Organization is unavailable.")
    ) {
      hasAccess = false;
    } else {
      throw error;
    }
  }

  if (!hasAccess) {
    return (
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-600">
          You do not have access to this organization.
        </p>
      </div>
    );
  }

  return (
    <section className="mt-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Analytics Overview</h2>
        <p className="mt-1 text-sm text-gray-600">
          Analytics for the active organization.
        </p>
      </div>

      <div className="mb-6">
        <LiveActivity />
      </div>

      <Suspense
        fallback={
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Loading overview statistics"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="mt-4 h-8 w-24 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        }
      >
        <OverviewStats
          userId={userId}
          tenantId={tenantId}
          startDate={formattedStartDate}
          endDate={formattedEndDate}
        />
      </Suspense>

      <Suspense
        fallback={
          <div
            className="animate-pulse rounded-xl border border-gray-200 bg-white p-6"
            aria-label="Loading top events"
          >
            <div className="h-5 w-32 rounded bg-gray-200" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="h-4 w-36 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <TopEvents
          userId={userId}
          tenantId={tenantId}
          startDate={formattedStartDate}
          endDate={formattedEndDate}
        />
      </Suspense>

      <Suspense
        fallback={
          <div
            className="animate-pulse rounded-xl border border-gray-200 bg-white p-6"
            aria-label="Loading funnel section"
          >
            <div className="h-5 w-40 rounded bg-gray-200" />
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-10 w-36 rounded-lg bg-gray-200" />
              ))}
            </div>
            <div className="mt-6 h-10 w-28 rounded-lg bg-gray-200" />
          </div>
        }
      >
        <FunnelSection
          userId={userId}
          tenantId={tenantId}
          startDate={formattedStartDate}
          endDate={formattedEndDate}
        />
      </Suspense>

      <Suspense
        fallback={
          <div
            className="animate-pulse rounded-xl border border-gray-200 bg-white p-6"
            aria-label="Loading retention heatmap"
          >
            <div className="h-5 w-40 rounded bg-gray-200" />

            <div className="mt-6 space-y-4">
              {Array.from({ length: 5 }, (_, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-3">
                  <div className="h-4 w-24 shrink-0 rounded bg-gray-200" />
                  {Array.from({ length: 6 }, (_, cellIndex) => (
                    <div
                      key={cellIndex}
                      className="h-8 flex-1 rounded bg-gray-200"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        }
      >
        <RetentionHeatmap
          startDate={formattedStartDate}
          endDate={formattedEndDate}
        />
      </Suspense>
    </section>
  );
};

export default AnalyticsOverview;
