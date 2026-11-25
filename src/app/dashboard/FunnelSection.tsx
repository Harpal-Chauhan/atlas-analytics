import { withTenant } from "@/lib/tenant-db";
import FunnelBuilder from "./FunnelBuilder";

type FunnelSectionProps = {
  userId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
};

const FunnelSection = async ({
  userId,
  tenantId,
  startDate,
  endDate,
}: FunnelSectionProps) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  end.setUTCDate(end.getUTCDate() + 1);

  const availableEventNames = await withTenant(userId, tenantId, async (tx) => {
    const eventGroups = await tx.eventDailyRollup.groupBy({
      by: ["eventName"],
      where: {
        tenantId,
        bucketStart: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        eventName: "asc",
      },
    });

    return eventGroups.map((item) => item.eventName);
  });

  return (
    <section className="w-full min-w-0">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#20B58A]" />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#176C52]">
              Conversion Insights
            </p>
          </div>

          <h2 className="mt-2 text-lg font-bold tracking-tight text-[#142B27] sm:text-xl">
            User Conversion Funnel
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#718078]">
            Analyze how users progress through your product journey and identify
            where conversions are lost.
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-xl border border-[#DCE8DD] bg-white px-3 py-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#176C52]"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
          </svg>

          <span className="text-xs font-semibold text-[#718078]">
            {startDate} — {endDate}
          </span>
        </div>
      </div>

      <FunnelBuilder
        eventNames={availableEventNames}
        startDate={startDate}
        endDate={endDate}
      />
    </section>
  );
};

export default FunnelSection;
