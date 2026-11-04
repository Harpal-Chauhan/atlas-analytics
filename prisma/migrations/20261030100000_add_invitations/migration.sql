
-- Create Invitation table
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'VIEWER',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- Unique token hash
CREATE UNIQUE INDEX "Invitation_tokenHash_key"
ON "Invitation"("tokenHash");

-- Invitation indexes
CREATE INDEX "Invitation_tenantId_email_idx"
ON "Invitation"("tenantId", "email");

CREATE INDEX "Invitation_expiresAt_idx"
ON "Invitation"("expiresAt");

-- Foreign keys
ALTER TABLE "Invitation"
ADD CONSTRAINT "Invitation_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
ADD CONSTRAINT "Invitation_invitedById_fkey"
FOREIGN KEY ("invitedById") REFERENCES "AuthUser"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" FORCE ROW LEVEL SECURITY;

-- Tenant-based access
CREATE POLICY "invitation_tenant_isolation"
ON "Invitation"
FOR ALL
USING (
    "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
);

-- Secure invitation lookup using token hash
CREATE POLICY "invitation_token_lookup"
ON "Invitation"
FOR SELECT
USING (
    "tokenHash" = current_setting('app.invitation_token_hash', true)
);

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "Invitation"
TO atlas_app;