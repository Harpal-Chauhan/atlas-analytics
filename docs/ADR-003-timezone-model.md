# ADR-003: Timezone Model

## Status
Accepted

## Context
ATLAS analytics uses event timestamps and date-based reporting across tenants. Consistent timezone handling is required for accurate daily and weekly analytics.

## Decision
- Event timestamps are stored using PostgreSQL `TIMESTAMPTZ`.
- Analytics date boundaries are calculated in UTC.
- Daily activity buckets use UTC.
- Weekly retention cohorts start on Monday using UTC week boundaries.
- Retention activity is grouped into UTC calendar weeks.
- Dashboard date formatting uses `en-IN` locale while keeping UTC date values unchanged.

## Known Limitation
`TenantUserActivityDaily` stores daily activity rather than individual event timestamps. Therefore, activity earlier on the same calendar day as signup cannot be excluded from Week 0 retention.

## Consequences
Using UTC consistently avoids timezone-dependent differences in analytics date boundaries and cohort calculations.