# 90-Day DAU Performance Test

## Requirement

The 90-day DAU query must execute in under 300ms.

## Dataset

- Dataset: 5 million realistic v2 seed events
- Tenants: 3
- Event date coverage: 90 days
- Benchmark source: Precomputed `TenantDailyRollup` table

## Query

EXPLAIN (ANALYZE, BUFFERS)
SELECT
"bucketStart"::date AS event_date,
SUM("uniqueUsers") AS daily_users
FROM "TenantDailyRollup"
WHERE
"tenantId" = '4396620c-fde5-4087-8b97-3874c61fdae6'
AND "bucketStart" >= NOW() - INTERVAL '90 days'
GROUP BY "bucketStart"::date
ORDER BY event_date;

## EXPLAIN ANALYZE Result

- Execution Time: 0.371 ms
- Planning Time: 1.077 ms
- Rows Returned: 90
- Rows Removed by Filter: 183
- Shared Buffers: 7 read

## Full Execution Plan

Sort (cost=16.02..16.18 rows=64 width=36) (actual time=0.308..0.311 rows=90.00 loops=1)
Sort Key: (("bucketStart")::date)
Sort Method: quicksort Memory: 27kB
Buffers: shared read=7
-> HashAggregate (cost=13.13..14.10 rows=64 width=36) (actual time=0.267..0.284 rows=90.00 loops=1)
Group Key: ("bucketStart")::date
Batches: 1 Memory Usage: 56kB
Buffers: shared read=7
-> Seq Scan on "TenantDailyRollup" (cost=0.00..12.69 rows=90 width=12) (actual time=0.119..0.197 rows=90.00 loops=1)
Filter: (("tenantId" = '4396620c-fde5-4087-8b97-3874c61fdae6'::text) AND ("bucketStart" >= (now() - '90 days'::interval)))
Rows Removed by Filter: 183
Buffers: shared read=7
Planning:
Buffers: shared hit=18
Planning Time: 1.077 ms
Execution Time: 0.371 ms

## Result

**PASS** — The 90-day DAU rollup query executes in 0.371 ms against the 5-million realistic v2 event dataset, comfortably below the required 300ms.

**Note:** This benchmark measures the query against the precomputed `TenantDailyRollup` table, not a raw scan of the 5-million-event `Event` table.