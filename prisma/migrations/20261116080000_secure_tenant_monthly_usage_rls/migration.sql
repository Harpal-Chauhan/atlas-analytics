-- TenantMonthlyUsage
ALTER TABLE "TenantMonthlyUsage"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "TenantMonthlyUsage"
FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_monthly_usage_isolation"
ON "TenantMonthlyUsage"
FOR ALL
USING (
    "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
);

-- Application permissions
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "TenantMonthlyUsage"
TO atlas_app;