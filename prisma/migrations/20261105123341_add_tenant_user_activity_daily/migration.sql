-- CreateTable
CREATE TABLE "TenantUserActivityDaily" (
    "tenantId" TEXT NOT NULL,
    "bucketStart" TIMESTAMPTZ(6) NOT NULL,
    "distinctId" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantUserActivityDaily_pkey" PRIMARY KEY ("tenantId","bucketStart","distinctId")
);

-- CreateIndex
CREATE INDEX "TenantUserActivityDaily_tenantId_distinctId_bucketStart_idx" ON "TenantUserActivityDaily"("tenantId", "distinctId", "bucketStart");

-- AddForeignKey
ALTER TABLE "TenantUserActivityDaily" ADD CONSTRAINT "TenantUserActivityDaily_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
