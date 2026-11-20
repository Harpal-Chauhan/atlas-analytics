# ADR-004: API Key Security

## Status
Accepted

## Context
ATLAS uses API keys to authenticate event ingestion requests. API keys must remain secure because they provide access to tenant-specific event ingestion.

Storing raw API keys in the database creates a security risk if the database is exposed.

## Decision
We decided to:
- Generate cryptographically secure random API keys.
- Store only hashed API keys in the database.
- Never store or log raw API keys.
- Display the raw API key only once when it is created.
- Support API key revocation.
- Track the last used timestamp for API keys.
- Verify API keys securely before accepting ingestion requests.

## Consequences

### Positive
- Database exposure does not directly reveal usable API keys.
- Revoked API keys can no longer authenticate requests.
- API key usage can be monitored.
- Tenant event ingestion remains protected.

### Negative
- Raw API keys cannot be displayed again after creation.
- Users must generate a new key if they lose the original key.

## Alternatives Considered
- Storing raw API keys directly in the database.
- Encrypting API keys instead of hashing them.

Hashing was selected because the application only needs to verify API keys, not retrieve their original values.