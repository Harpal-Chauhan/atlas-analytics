
-- Grant application role access to the event ingestion idempotency table.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "EventIngestionRequest"
TO atlas_app;
