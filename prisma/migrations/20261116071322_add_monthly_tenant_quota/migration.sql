-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "monthlyEventQuota" INTEGER NOT NULL DEFAULT 1000000;

-- CreateTable
CREATE TABLE "TenantMonthlyUsage" (
    "tenantId" TEXT NOT NULL,
    "monthStart" DATE NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantMonthlyUsage_pkey" PRIMARY KEY ("tenantId","monthStart")
);

-- CreateIndex
CREATE INDEX "TenantMonthlyUsage_monthStart_idx" ON "TenantMonthlyUsage"("monthStart");

-- AddForeignKey
ALTER TABLE "TenantMonthlyUsage" ADD CONSTRAINT "TenantMonthlyUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
