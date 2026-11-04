# ADR-002: Row-Level Security and Connection Pooling

## Status
Accepted

## Context
ATLAS is a multi-tenant analytics platform. Each organization must access only its own data.

PostgreSQL Row-Level Security (RLS) is used to enforce tenant-level data isolation.

The application uses transaction-local PostgreSQL settings such as `app.user_id` and `app.tenant_id` to identify the current user and tenant.

## Decision
The application will use Prisma interactive transactions to execute tenant-scoped database operations.

Before accessing tenant data, the application sets the required context using `set_config(..., true)`.

The `true` argument makes these settings transaction-local, so they are automatically cleared when the transaction ends.

The current development setup uses a direct PostgreSQL connection through the `atlas_app` database role. PgBouncer is not currently configured.

## Connection Pooling Considerations
If connection pooling is introduced in the future:

- Tenant context must always be set inside the same transaction as the database queries.
- Transaction-local settings must be used instead of session-level settings.
- Tenant-scoped queries must not execute outside the transaction.
- RLS policies must remain enabled and enforced.

## Consequences
- Tenant data isolation is enforced by PostgreSQL.
- Transaction-local settings reduce the risk of tenant context leaking between reused connections.
- All tenant-scoped operations must follow the shared transaction helper.
- Any future pooling configuration must be tested with RLS isolation tests.

## Conclusion
ATLAS currently uses direct PostgreSQL connections with Prisma transactions. Transaction-local RLS context provides tenant isolation and supports safe connection reuse. Future pooling changes must preserve these guarantees.