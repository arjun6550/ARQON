# ADR-0007: Server-authoritative exam timer
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
Client timers are untrustworthy.

## Decision
Store started_at/deadline server-side; client fetches remaining time; reconnect never resets.

## Consequences
Need clock-skew-safe responses and extension audit.
