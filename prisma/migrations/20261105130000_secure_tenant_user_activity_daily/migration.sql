-- Enable Row Level Security
ALTER TABLE "TenantUserActivityDaily"
ENABLE ROW LEVEL SECURITY;

-- Force Row Level Security
ALTER TABLE "TenantUserActivityDaily"
FORCE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "tenant_user_activity_daily_isolation"
ON "TenantUserActivityDaily"
FOR ALL
USING (
    "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
);

-- Application permissions
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "TenantUserActivityDaily"
TO atlas_app;