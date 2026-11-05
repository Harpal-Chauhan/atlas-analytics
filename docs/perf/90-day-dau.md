
# 90-Day DAU Performance Test

## Requirement

The 90-day DAU query must execute in under 300ms.

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

- Execution Time: 0.597 ms
- Planning Time: 3.010 ms
- Rows Returned: 89
- Shared Buffers: 6

## Full Execution Plan


Sort  (cost=14.98..15.13 rows=63 width=36) (actual time=0.427..0.434 rows=89.00 loops=1)
  Sort Key: (("bucketStart")::date)
  Sort Method: quicksort  Memory: 27kB
  Buffers: shared hit=6
  ->  HashAggregate  (cost=12.15..13.09 rows=63 width=36) (actual time=0.336..0.376 rows=89.00 loops=1)
        Group Key: ("bucketStart")::date
        Batches: 1  Memory Usage: 56kB
        Buffers: shared hit=6
        ->  Seq Scan on "TenantDailyRollup"  (cost=0.00..11.70 rows=89 width=12) (actual time=0.109..0.212 rows=89.00 loops=1)
              Filter: (("tenantId" = '4396620c-fde5-4087-8b97-3874c61fdae6'::text) AND ("bucketStart" >= (now() - '90 days'::interval)))
              Rows Removed by Filter: 185
              Buffers: shared hit=6
Planning:
  Buffers: shared hit=18
Planning Time: 3.010 ms
Execution Time: 0.597 ms


## Result

**PASS** — The 90-day DAU rollup query executes in under the required 300ms.
