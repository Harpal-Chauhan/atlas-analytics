# ADR-005: Event Idempotency

## Status
Accepted

## Context
ATLAS accepts single and batch event ingestion requests. Network retries or repeated client requests can cause the same event to be submitted multiple times.

Duplicate events can affect analytics results, event counts, and reporting accuracy.

## Decision
We decided to implement event idempotency using idempotency keys.

- Each ingestion request can include an idempotency key.
- The application checks whether the key has already been processed.
- Previously processed requests are identified as duplicates.
- Idempotency records are maintained for 24 hours.
- Duplicate requests do not create duplicate event records.
- The API returns a response indicating whether the request was accepted or identified as a duplicate.

## Consequences

### Positive
- Prevents duplicate event ingestion during retries.
- Improves analytics data accuracy.
- Makes ingestion safer for clients with unreliable network connections.

### Negative
- Idempotency records require additional database storage.
- The application must check idempotency before processing repeated requests.

## Alternatives Considered
- Accepting every request without duplicate detection.
- Using event properties alone to identify duplicate events.

Idempotency keys were selected because they provide a clear and predictable way to identify repeated ingestion requests.