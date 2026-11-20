# ADR-008: Observability and Error Monitoring

## Status
Accepted

## Context
ATLAS is a multi-tenant analytics platform with multiple API routes and background processing tasks.

Identifying application errors, tracking request execution, and monitoring production issues are important for maintaining reliability and debugging problems.

## Decision
We decided to implement structured logging and Sentry error monitoring.

- Each API request receives a unique request ID.
- Incoming valid request IDs are preserved.
- Structured logs are written in JSON format.
- Logs include timestamps, severity levels, event names, and request IDs.
- Sensitive information such as passwords, API keys, and authentication tokens must not be logged.
- Sentry is integrated to capture application errors.
- Performance tracing is enabled with environment-specific sampling rates.

## Consequences

### Positive
- Makes API requests easier to trace.
- Improves production error visibility.
- Helps identify and investigate application failures.
- Supports performance monitoring.

### Negative
- Monitoring introduces an additional external service dependency.
- Error reporting and tracing require configuration.
- Excessive logging or tracing can increase operational costs.

## Alternatives Considered
- Using only console logs without structured fields.
- Relying exclusively on manual error investigation.
- Implementing a custom error-monitoring platform.

Structured logging and Sentry were selected to improve observability while keeping monitoring maintainable.