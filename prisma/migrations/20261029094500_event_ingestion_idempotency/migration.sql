CREATE TABLE "EventIngestionRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "idempotencyKeyHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventIngestionRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EventIngestionRequest_tenantId_fkey"
        FOREIGN KEY ("tenantId")
        REFERENCES "Tenant"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EventIngestionRequest_tenantId_idempotencyKeyHash_key"
    ON "EventIngestionRequest"("tenantId", "idempotencyKeyHash");

CREATE INDEX "EventIngestionRequest_expiresAt_idx"
    ON "EventIngestionRequest"("expiresAt");
