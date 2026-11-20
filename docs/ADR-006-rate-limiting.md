# ADR-006: API Rate Limiting

## Status
Accepted

## Context
ATLAS exposes event ingestion APIs that may receive a large number of requests from clients. Without rate limiting, excessive requests could affect application performance and database availability.

## Decision
We decided to implement a token-bucket rate-limiting mechanism.

- Rate limits are enforced for API key requests.
- Token usage is tracked in PostgreSQL.
- Database row locking helps prevent concurrent requests from exceeding the allowed limit.
- Requests exceeding the limit receive HTTP 429.
- The response includes retry information when applicable.

## Consequences

### Positive
- Protects the ingestion API from excessive traffic.
- Helps maintain predictable application performance.
- Supports controlled request retries.

### Negative
- Rate-limit checks add database operations.
- The token bucket requires persistent state.

## Alternatives Considered
- No rate limiting.
- In-memory rate limiting.

A database-backed token bucket was selected to provide persistent and concurrency-aware rate limiting.