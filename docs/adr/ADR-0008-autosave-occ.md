# ADR-0008: Debounced autosave with optimistic concurrency
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
Prevent stale overwrites at 1k+ writes/s.

## Decision
Version + sequence numbers, upsert latest draft, snapshot at milestones.

## Consequences
Client handles 409 conflicts; load-test required.
