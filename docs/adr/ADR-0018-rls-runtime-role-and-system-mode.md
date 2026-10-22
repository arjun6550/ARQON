# ADR-0018: Row-Level Security with a non-owner runtime role and explicit "system" mode
Status: Proposed (implemented in Slice 1.1)
Date: 2026-10-06

## Context
ADR-0004 requires RLS as defence in depth. RLS is bypassed by superusers and (without FORCE) by table owners, and the Docker/Testcontainers default user is a superuser, so a naive setup silently enforces nothing. Login must look users up before the tenant is known.

## Decision
- Migrations run as the owner role; the application connects as `arqon_app` (NOSUPERUSER, NOBYPASSRLS, not owner) with DML grants only.
- Policies read transaction-scoped settings: `app.tenant_id` (tenant access) or `app.system = 'on'` (platform access). Neither set => no rows (fail closed).
- `RlsSession.asTenant(id)` takes the id from the verified token (TenantContext). `asSystem()` is used only for login/refresh, bootstrap and SUPER_ADMIN operations.
- Integration tests connect as `arqon_app` and assert that a context-free connection sees zero rows.

## Consequences
Every DB access must happen inside a transaction that sets the context. `asSystem()` is a sensitive call site: code review + audit. A SQL-injection attacker could still call set_config, so RLS complements, never replaces, parameterised queries and authorization. Production needs the role created via IaC (per-service roles later).
