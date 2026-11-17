-- CreateIndex
CREATE INDEX "Event_tenantId_distinctId_eventName_occurredAt_idx" ON "Event"("tenantId", "distinctId", "eventName", "occurredAt");
