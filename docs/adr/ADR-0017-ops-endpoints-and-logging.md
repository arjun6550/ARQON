# ADR-0017: Separate management port, structured logs, correlation id vs trace id
Status: Proposed (implemented in Slice 1.0)
Date: 2026-10-05

## Context
Actuator/Prometheus endpoints must not be internet-reachable through the gateway; logs must be machine-parseable and correlatable.

## Decision
- Actuator runs on a separate management port (gateway 9080, identity 9081); the gateway never routes to it. Only health/info/prometheus exposed, health details hidden.
- Prod profile uses Spring Boot structured logging (ECS JSON). MDC carries correlationId, tenantId (once known) and traceId.
- Gateway accepts/creates X-Correlation-Id (validated against ^[A-Za-z0-9._-]{8,64}$ to prevent log injection) and strips client-supplied tenant/user headers.
- Error bodies carry traceId (distributed trace id when available, else correlation id).
- Gateway (reactive) does not depend on arqon-common (servlet); the tiny error body is duplicated until shared api-contracts exist.

## Consequences
Kubernetes probes/Prometheus must target the management port. Slight duplication between gateway and common error shapes (covered by tests on both sides).
