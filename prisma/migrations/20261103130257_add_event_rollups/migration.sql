-- CreateTable
CREATE TABLE "TenantHourlyRollup" (
    "tenantId" TEXT NOT NULL,
    "bucketStart" TIMESTAMPTZ(6) NOT NULL,
    "eventCount" BIGINT NOT NULL DEFAULT 0,
    "uniqueUsers" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantHourlyRollup_pkey" PRIMARY KEY ("tenantId","bucketStart")
);

-- CreateTable
CREATE TABLE "TenantDailyRollup" (
    "tenantId" TEXT NOT NULL,
    "bucketStart" TIMESTAMPTZ(6) NOT NULL,
    "eventCount" BIGINT NOT NULL DEFAULT 0,
    "uniqueUsers" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantDailyRollup_pkey" PRIMARY KEY ("tenantId","bucketStart")
);

-- CreateTable
CREATE TABLE "EventHourlyRollup" (
    "tenantId" TEXT NOT NULL,
    "bucketStart" TIMESTAMPTZ(6) NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventCount" BIGINT NOT NULL DEFAULT 0,
    "uniqueUsers" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EventHourlyRollup_pkey" PRIMARY KEY ("tenantId","bucketStart","eventName")
);

-- CreateTable
CREATE TABLE "EventDailyRollup" (
    "tenantId" TEXT NOT NULL,
    "bucketStart" TIMESTAMPTZ(6) NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventCount" BIGINT NOT NULL DEFAULT 0,
    "uniqueUsers" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EventDailyRollup_pkey" PRIMARY KEY ("tenantId","bucketStart","eventName")
);

-- CreateIndex
CREATE INDEX "EventHourlyRollup_tenantId_eventName_bucketStart_idx" ON "EventHourlyRollup"("tenantId", "eventName", "bucketStart");

-- CreateIndex
CREATE INDEX "EventDailyRollup_tenantId_eventName_bucketStart_idx" ON "EventDailyRollup"("tenantId", "eventName", "bucketStart");

-- AddForeignKey
ALTER TABLE "TenantHourlyRollup" ADD CONSTRAINT "TenantHourlyRollup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDailyRollup" ADD CONSTRAINT "TenantDailyRollup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHourlyRollup" ADD CONSTRAINT "EventHourlyRollup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDailyRollup" ADD CONSTRAINT "EventDailyRollup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
