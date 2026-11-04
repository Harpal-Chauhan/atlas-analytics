-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'VIEWER');

-- CreateTable
CREATE TABLE "AuthUser" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AuthUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "suspendedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" BIGSERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "userId" TEXT,
    "eventName" TEXT NOT NULL,
    "distinctId" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_email_key" ON "AuthUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "Event_tenantId_occurredAt_idx" ON "Event"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "Event_tenantId_eventName_occurredAt_idx" ON "Event"("tenantId", "eventName", "occurredAt");

-- CreateIndex
CREATE INDEX "Event_tenantId_distinctId_occurredAt_idx" ON "Event"("tenantId", "distinctId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AuthUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row-Level Security on tenant-scoped tables.
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" FORCE ROW LEVEL SECURITY;

-- Tenant: only the active tenant row is accessible.
CREATE POLICY "tenant_isolation"
ON "Tenant"
USING (
  "id" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "id" = current_setting('app.tenant_id', true)
);

-- Membership: only memberships belonging to the active tenant.
CREATE POLICY "membership_tenant_isolation"
ON "Membership"
USING (
  "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)
);

-- API keys: isolate keys by tenant.
CREATE POLICY "apikey_tenant_isolation"
ON "ApiKey"
USING (
  "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)
);

-- Events: isolate reads and writes by tenant.
CREATE POLICY "event_tenant_isolation"
ON "Event"
USING (
  "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)
);

-- Allow the application role to use the Phase 1 tables.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "AuthUser", "Tenant", "Membership", "ApiKey", "Event"
TO atlas_app;

-- Allow generated Event IDs to use the sequence.
GRANT USAGE, SELECT, UPDATE
ON SEQUENCE "Event_id_seq"
TO atlas_app;