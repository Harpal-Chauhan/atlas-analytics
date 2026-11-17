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

  const eventRollups = await withTenant(userId, tenantId, async (tx) =>
    tx.eventDailyRollup.findMany({
      where: {
        tenantId,
        bucketStart: {
          gte: start,
          lt: end,
        },
      },
      select: {
        eventName: true,
      },
    }),
  );

  const availableEventNames = Array.from(
    new Set(eventRollups.map((item) => item.eventName)),
  );

  return (
    <FunnelBuilder
      eventNames={availableEventNames}
      startDate={startDate}
      endDate={endDate}
    />
  );
};

export default FunnelSection;
