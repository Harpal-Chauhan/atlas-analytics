# ADR-001: Store Event Properties as JSONB

## Status
Accepted

## Context
ATLAS is a multi-tenant product analytics platform. Events can contain different properties depending on the event type.

For example:
- `page_view` may contain `pageUrl`.
- `purchase` may contain `productId` and `amount`.
- `signup` may contain `source`.

Using fixed database columns for every possible property would make the schema difficult to maintain.

## Decision
We will store event properties in PostgreSQL using the JSONB data type.

The `Event` model will use a JSON field for its properties, which Prisma maps to PostgreSQL JSONB.

## Reasons
- Supports flexible event structures.
- Allows different event types to store different properties.
- PostgreSQL provides JSONB querying capabilities.
- Avoids creating new database columns for every event property.
- Keeps the event schema simple.

## Consequences
- Event properties must be validated before insertion.
- Queries on frequently accessed JSON properties may need indexes.
- JSONB does not enforce a fixed structure, so application-level validation is important.

## Conclusion
JSONB is suitable for ATLAS because analytics events have flexible property structures. It provides flexibility while keeping event storage manageable.