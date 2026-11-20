
# 90-Day DAU Performance Test

## Requirement

The 90-day DAU query must execute in under 300ms.

## Dataset

- Target dataset: 5 million realistic events
- Minimum tenants: 3
- Event date coverage: 90 days
- Benchmark source: TenantDailyRollup
- Query type: Precomputed daily unique-user aggregation

## Benchmark Environment

Record these details when running the benchmark:

- PostgreSQL version: Pending verification
- Node.js version: Pending verification
- Prisma version: 6.19.3
- Dataset size: Pending verification
- Benchmark date: Pending verification
- Tenant ID: Use the tenant selected for the benchmark

## Query

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    "bucketStart"::date AS event_date,
    "uniqueUsers" AS daily_users
FROM "TenantDailyRollup"
WHERE
    "tenantId" = '4396620c-fde5-4087-8b97-3874c61fdae6'
    AND "bucketStart" >= NOW() - INTERVAL '90 days'
ORDER BY event_date;
```

## Benchmark Result

Previously documented result:

- Execution Time: 1.002 ms
- Planning Time: 0.318 ms
- Rows Returned: 89
- Shared Read Buffers: 7
- Sort Method: quicksort (in-memory)

Note: This is a previously recorded result and has not yet been independently re-verified.

## Verification Status

PENDING — Run the benchmark against the prepared dataset and record the actual EXPLAIN ANALYZE output.

Acceptance criteria:

- Query execution time must be below 300ms.
- The selected tenant must have the expected 90-day data coverage.
- The result must be captured from the actual PostgreSQL benchmark.

## Notes

The query reads precomputed daily unique-user counts from TenantDailyRollup.

Daily unique-user counts must not be summed across multiple dates to calculate a period-wide unique-user total because the same user may appear on multiple days.


## Verified Benchmark Result

- PostgreSQL Server: 18.6
- Node.js: 24.18.0
- Prisma: 6.19.3
- Dataset: 5,000,000 realistic events
- Tenants: 5
- Benchmark Date: 2026-11-20
- Tenant ID: 4396620c-fde5-4087-8b97-3874c61fdae6

### EXPLAIN ANALYZE Result

- Execution Time: 0.909 ms
- Planning Time: 3.540 ms
- Actual Rows: 90
- Rows Removed by Filter: 365
- Shared Buffers: hit=3, read=8

### Acceptance Criteria

- Target: Below 300 ms
- Actual: 0.909 ms
- Result: PASS

The 90-day DAU benchmark was successfully verified
using PostgreSQL EXPLAIN ANALYZE against TenantDailyRollup.
