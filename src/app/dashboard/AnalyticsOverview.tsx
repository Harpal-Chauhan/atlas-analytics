import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDateRange } from "./analytics-utils";

import OverviewStats from "./OverviewStats";
import TopEvents from "./TopEvents";
import FunnelSection from "./FunnelSection";
import RetentionHeatmap from "./RetentionHeatmap";

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

  const hasAccess = await prisma.$transaction(
    async (tx) => {
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

      return Boolean(membership);
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );

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

      <Suspense
        fallback={
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            Loading overview statistics...
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
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            Loading top events...
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
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            Loading funnel analysis...
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

      <RetentionHeatmap
        startDate={formattedStartDate}
        endDate={formattedEndDate}
      />
    </section>
  );
};

export default AnalyticsOverview;
