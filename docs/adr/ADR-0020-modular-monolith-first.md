# ADR-0020: Modular monolith first; extract services only where isolation or scaling demands it
Status: Accepted (decided by the product owner; supersedes ADR-0002)
Date: 2026-10-06

## Context
Running identity, organization and the gateway as separate apps added local-dev and operations cost with no scaling benefit at the MVP stage (hundreds to a few thousand candidates is comfortably served by several identical copies of one app).

## Decision
- One deployable, `arqon-core`, hosts the MVP modules: identity, organization, and later question-bank, assessment, invitation, exam-session, evaluation, reporting.
- Each module owns its package (`com.arqon.core.<module>`), its DB schema, its Flyway folder/history table and its tables; no cross-schema queries or FKs.
- Modules talk only through a published API at the module root (e.g. `OrganizationApi`). `ModuleBoundaryTest` (ArchUnit) fails the build on violations.
- Tenant isolation (RLS, token-derived tenant), JWT and RBAC are unchanged.
- Stay separate services/infrastructure: **code execution** (hostile code, isolated nodes) and **proctoring/media** (video, SFU, AI inference). The API gateway stays (rate limiting, correlation) and is optional for local runs.
- Extraction path: a module's published API becomes a remote client; its schema moves to its own database; events (outbox) already exist for async paths.

## Consequences
Simpler to run, debug and test; transactions can span modules where truly needed (use sparingly). Scale by replicas; hot modules (exam-session) can be extracted later. Discipline is enforced by tests rather than by network boundaries.
