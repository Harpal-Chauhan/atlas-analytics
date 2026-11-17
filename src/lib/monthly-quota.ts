
import type { Prisma } from "@/generated/prisma/client";

type MonthlyQuotaResult = {
    allowed: boolean;
    used: number;
    limit: number;
    remaining: number;
    monthStart: Date;
};

export const consumeMonthlyQuota = async (
    tx: Prisma.TransactionClient,
    tenantId: string,
    eventCount: number,
): Promise<MonthlyQuotaResult> => {
    if (!Number.isSafeInteger(eventCount) || eventCount <= 0) {
        throw new Error("Event count must be a positive integer.");
    }
    const now = new Date();

    const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const monthStartDate = monthStart.toISOString().slice(0, 10);

    const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { monthlyEventQuota: true },
    });

    if (!tenant) {
        throw new Error("Tenant not found.");
    }

    const quota = tenant.monthlyEventQuota;


    const updatedRows = await tx.$queryRaw<
        { eventCount: number }[]
    >`
    INSERT INTO "TenantMonthlyUsage" (
      "tenantId",
      "monthStart",
      "eventCount",
      "updatedAt"
    )
    SELECT
      ${tenantId},
      ${monthStartDate}::date,
      ${eventCount},
      NOW()
    WHERE ${eventCount} <= ${quota}
    ON CONFLICT ("tenantId", "monthStart")
    DO UPDATE SET
      "eventCount" =
        "TenantMonthlyUsage"."eventCount" + EXCLUDED."eventCount",
      "updatedAt" = NOW()
    WHERE
      "TenantMonthlyUsage"."eventCount" + EXCLUDED."eventCount"
      <= ${quota}
    RETURNING "eventCount"
  `;


    const updatedRow = updatedRows[0];

    if (updatedRow) {
        const used = updatedRow.eventCount;

        return {
            allowed: true,
            used,
            limit: quota,
            remaining: Math.max(0, quota - used),
            monthStart,
        };
    }

    const usage = await tx.tenantMonthlyUsage.findUnique({
        where: {
            tenantId_monthStart: {
                tenantId,
                monthStart,
            },
        },
        select: { eventCount: true },
    });

    const used = usage?.eventCount ?? 0;

    return {
        allowed: false,
        used,
        limit: quota,
        remaining: Math.max(0, quota - used),
        monthStart,
    };
};
