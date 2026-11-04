
-- Enable and force Row Level Security.
ALTER TABLE "ApiKeyRateLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKeyRateLimit" FORCE ROW LEVEL SECURITY;

-- Allow access only when the related API key belongs
-- to the currently active tenant.
CREATE POLICY "api_key_rate_limit_tenant_isolation"
ON "ApiKeyRateLimit"
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM "ApiKey"
        WHERE "ApiKey"."id" = "ApiKeyRateLimit"."apiKeyId"
          AND "ApiKey"."tenantId" = current_setting('app.tenant_id', true)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM "ApiKey"
        WHERE "ApiKey"."id" = "ApiKeyRateLimit"."apiKeyId"
          AND "ApiKey"."tenantId" = current_setting('app.tenant_id', true)
    )
);

-- Give the application role the required table permissions.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "ApiKeyRateLimit"
TO atlas_app;
