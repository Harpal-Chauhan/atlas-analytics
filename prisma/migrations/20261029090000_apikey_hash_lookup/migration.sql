ALTER TABLE "ApiKey"
ADD COLUMN "keyLookupHash" TEXT;

CREATE UNIQUE INDEX "ApiKey_keyLookupHash_key"
ON "ApiKey"("keyLookupHash");

CREATE POLICY "apikey_hash_lookup"
ON "ApiKey"
FOR SELECT
USING (
    "keyLookupHash" = current_setting('app.api_key_hash', true)
);