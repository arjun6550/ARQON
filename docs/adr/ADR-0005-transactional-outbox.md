# ADR-0005: Transactional outbox + idempotent consumers
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
Dual write DB+Kafka is unreliable.

## Decision
Outbox table per service, polling publisher, processed_events table in consumers.

## Consequences
At-least-once delivery, no lost events; need cleanup jobs.
