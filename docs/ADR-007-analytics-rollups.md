# ADR-007: Precomputed Analytics Rollups

## Status
Accepted

## Context
Calculating analytics metrics directly from millions of raw events for every dashboard request can increase query execution time and database load.

ATLAS requires efficient DAU, event volume, and other analytics queries across multiple tenants.

## Decision
We decided to use scheduled aggregation and precomputed rollup tables.

- Raw events are aggregated into hourly and daily rollups.
- Tenant-level and event-level statistics are maintained.
- Daily user activity is stored for distinct-user analytics.
- Dashboard queries use precomputed data wherever appropriate.
- Rollup processing is designed to support repeatable execution.

## Consequences

### Positive
- Reduces repeated aggregation over raw event data.
- Improves dashboard query performance.
- Supports analytics across large event datasets.

### Negative
- Rollup tables require additional storage.
- Aggregation jobs must be executed and monitored.
- Dashboard data may reflect the latest completed aggregation rather than every newly ingested event.

## Alternatives Considered
- Running every analytics query directly against raw events.
- Maintaining only application-side cached analytics.

Precomputed PostgreSQL rollups were selected to support scalable analytics queries.