
ALTER TABLE "EventIngestionRequest"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "EventIngestionRequest"
FORCE ROW LEVEL SECURITY;

CREATE POLICY "event_ingestion_request_tenant_isolation"
ON "EventIngestionRequest"
FOR ALL
USING (
    "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
);
