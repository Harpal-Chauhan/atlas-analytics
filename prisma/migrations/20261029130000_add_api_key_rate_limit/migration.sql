CREATE TABLE "ApiKeyRateLimit" (
    "apiKeyId" TEXT NOT NULL,
    "tokens" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "lastRefillAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ApiKeyRateLimit_pkey"
        PRIMARY KEY ("apiKeyId"),

    CONSTRAINT "ApiKeyRateLimit_apiKeyId_fkey"
        FOREIGN KEY ("apiKeyId")
        REFERENCES "ApiKey"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);