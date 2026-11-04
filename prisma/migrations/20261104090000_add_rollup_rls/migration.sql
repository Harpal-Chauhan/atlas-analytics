
-- TenantHourlyRollup
ALTER TABLE "TenantHourlyRollup"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "TenantHourlyRollup"
FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_hourly_rollup_isolation"
ON "TenantHourlyRollup"
FOR ALL
USING (
    "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
);


-- TenantDailyRollup
ALTER TABLE "TenantDailyRollup"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "TenantDailyRollup"
FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_daily_rollup_isolation"
ON "TenantDailyRollup"
FOR ALL
USING (
    "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
);


-- EventHourlyRollup
ALTER TABLE "EventHourlyRollup"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "EventHourlyRollup"
FORCE ROW LEVEL SECURITY;

CREATE POLICY "event_hourly_rollup_isolation"
ON "EventHourlyRollup"
FOR ALL
USING (
    "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
);


-- EventDailyRollup
ALTER TABLE "EventDailyRollup"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "EventDailyRollup"
FORCE ROW LEVEL SECURITY;

CREATE POLICY "event_daily_rollup_isolation"
ON "EventDailyRollup"
FOR ALL
USING (
    "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
);


-- Application permissions
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE
    "TenantHourlyRollup",
    "TenantDailyRollup",
    "EventHourlyRollup",
    "EventDailyRollup"
TO atlas_app;
