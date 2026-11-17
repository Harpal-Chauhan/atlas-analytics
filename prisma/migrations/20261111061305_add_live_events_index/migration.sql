-- CreateIndex
CREATE INDEX "Event_tenantId_receivedAt_idx" ON "Event"("tenantId", "receivedAt");
