# ADR-0006: Postgres is source of truth; Redis ephemeral
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
Exam answers/timers must survive failures.

## Decision
All durable state in Postgres; Redis only caches/limits/locks/pubsub.

## Consequences
Redis outage degrades but never loses data.
