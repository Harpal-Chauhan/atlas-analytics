import { Suspense } from "react";
import { auth } from "@/auth";
import { getDateRange } from "./analytics-utils";

import OverviewStats from "./OverviewStats";
import TopEvents from "./TopEvents";
import FunnelSection from "./FunnelSection";
import RetentionHeatmap from "./RetentionHeatmap";
import LiveActivity from "./LiveActivity";
import { withTenant } from "@/lib/tenant-db";
import HourlyActivity from "./HourlyActivity";

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
      <section className="mt-6 rounded-2xl border border-[#DCE8DD] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-[#176C52]">
            <span className="text-xl">▦</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#142B27]">
              Analytics Overview
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#718078]">
              Select an active organization to view your analytics data.
            </p>
          </div>
        </div>
      </section>
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
      <section className="mt-6 rounded-2xl border border-[#F4D8D0] bg-[#FFF7F3] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFE8DF] text-lg text-[#B85D46]">
            !
          </span>

          <div>
            <h2 className="text-sm font-bold text-[#8E4938]">
              Organization Access Restricted
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#A36D60]">
              You do not have access to this organization. Please select an
              organization where you have membership.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 min-w-0 space-y-6 sm:mt-8 sm:space-y-8">
      {/* ANALYTICS HEADER */}

      <div className="flex flex-col gap-4 border-b border-[#E3EBE2] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#D5E8D8] bg-[#F1F8EF] px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-[#20B58A]" />

            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#176C52]">
              Performance Insights
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-[#142B27] sm:text-2xl">
            Analytics Overview
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#718078]">
            Understand user activity, monitor product engagement,
            {"and track your organization's performance"}.
          </p>
        </div>

        <div className="w-fit rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#829087]">
            Reporting Period
          </p>

          <p className="mt-1 text-xs font-bold text-[#176C52]">
            {formattedStartDate} — {formattedEndDate}
          </p>
        </div>
      </div>

      {/* LIVE ACTIVITY */}

      <div className="min-w-0 space-y-3">
        <div>
          <h3 className="text-base font-bold text-[#142B27]">Live Activity</h3>

          <p className="mt-1 text-xs text-[#829087]">
            Monitor incoming product events in real time.
          </p>
        </div>

        <div className="min-w-0">
          <LiveActivity />
        </div>

        {/* HOURLY ACTIVITY */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-[#142B27]">
                Hourly Activity
              </h3>

              <p className="mt-1 text-xs text-[#829087]">
                Explore how your product events change throughout the day.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#B9DDC8] bg-[#EAF3E9] px-3 py-1.5 text-xs font-semibold text-[#176C52]">
              <span className="h-2 w-2 rounded-full bg-[#20B58A]" />
              Last 24 Hours
            </span>
          </div>

          <Suspense
            fallback={
              <div className="animate-pulse rounded-2xl border border-[#DCE8DD] bg-white p-5 shadow-sm sm:p-6">
                <div className="h-5 w-40 rounded bg-[#E8EEE7]" />

                <div className="mt-6 space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="h-3 w-16 rounded bg-[#F0F3ED]" />
                      <div className="h-3 flex-1 rounded-full bg-[#F0F3ED]" />
                      <div className="h-3 w-10 rounded bg-[#E8EEE7]" />
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <HourlyActivity userId={userId} tenantId={tenantId} />
          </Suspense>
        </div>
      </div>

      {/* OVERVIEW STATISTICS */}

      <div id="key-performance" className="min-w-0 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#142B27]">
            Key Performance Indicators
          </h3>

          <p className="mt-1 text-xs text-[#829087]">
            A summary of your product performance.
          </p>
        </div>

        <Suspense
          fallback={
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Loading overview statistics"
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-[#DCE8DD] bg-white p-5 sm:p-6"
                >
                  <div className="h-3 w-28 rounded bg-[#E8EEE7]" />
                  <div className="mt-5 h-8 w-24 rounded bg-[#E8EEE7]" />
                  <div className="mt-4 h-3 w-20 rounded bg-[#F0F3ED]" />
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
      </div>

      {/* TOP EVENTS */}

      <div className="min-w-0 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#142B27]">
            Event Performance
          </h3>

          <p className="mt-1 text-xs text-[#829087]">
            Discover which actions happen most frequently in your product.
          </p>
        </div>

        <Suspense
          fallback={
            <div
              className="animate-pulse rounded-2xl border border-[#DCE8DD] bg-white p-5 sm:p-6"
              aria-label="Loading top events"
            >
              <div className="h-5 w-32 rounded bg-[#E8EEE7]" />

              <div className="mt-6 space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[#EDF1EB] p-4"
                  >
                    <div className="h-4 w-36 rounded bg-[#E8EEE7]" />
                    <div className="h-4 w-16 rounded bg-[#E8EEE7]" />
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
      </div>

      {/* FUNNEL ANALYTICS */}

      <div className="min-w-0 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#142B27]">
            Conversion Analytics
          </h3>

          <p className="mt-1 text-xs text-[#829087]">
            Analyze how users progress through your product funnel.
          </p>
        </div>

        <Suspense
          fallback={
            <div
              className="animate-pulse rounded-2xl border border-[#DCE8DD] bg-white p-5 sm:p-6"
              aria-label="Loading funnel section"
            >
              <div className="h-5 w-40 rounded bg-[#E8EEE7]" />

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 rounded-xl bg-[#F0F3ED]" />
                ))}
              </div>

              <div className="mt-6 h-10 w-28 rounded-lg bg-[#E8EEE7]" />
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
      </div>

      {/* RETENTION ANALYTICS */}

      <div className="min-w-0 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#142B27]">User Retention</h3>

          <p className="mt-1 text-xs text-[#829087]">
            Understand how consistently users return to your product.
          </p>
        </div>

        <Suspense
          fallback={
            <div
              className="animate-pulse overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white p-5 sm:p-6"
              aria-label="Loading retention heatmap"
            >
              <div className="h-5 w-40 rounded bg-[#E8EEE7]" />

              <div className="mt-6 space-y-4">
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <div key={rowIndex} className="flex items-center gap-3">
                    <div className="h-4 w-16 shrink-0 rounded bg-[#E8EEE7] sm:w-24" />

                    <div className="grid flex-1 grid-cols-6 gap-2">
                      {Array.from({ length: 6 }).map((_, cellIndex) => (
                        <div
                          key={cellIndex}
                          className="h-8 rounded-md bg-[#E8EEE7]"
                        />
                      ))}
                    </div>
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
      </div>
    </section>
  );
};

export default AnalyticsOverview;
