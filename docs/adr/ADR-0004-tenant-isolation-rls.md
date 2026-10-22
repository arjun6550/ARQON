# ADR-0004: tenant_id + Row-Level Security
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
Shared-DB multi-tenancy needs defence in depth.

## Decision
tenant_id on all rows, Hibernate filter, Postgres RLS, tenant from token only.

## Consequences
Slight perf/complexity cost; strong leakage protection.
