# ADR-0003: Shared PostgreSQL cluster, schema + role per service
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
Service-owned data without cost of many databases.

## Decision
One cluster, one schema and DB role per service, no cross-schema grants or FKs.

## Consequences
Cheap now; extractable to separate DBs later.
