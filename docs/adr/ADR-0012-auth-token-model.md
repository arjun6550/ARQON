# ADR-0012: Short JWT + rotating HttpOnly refresh cookie
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
Balance statelessness and revocation.

## Decision
10-min JWT, rotating refresh with reuse detection, server-side sessions.

## Consequences
CSRF strategy needed for cookie endpoints.
