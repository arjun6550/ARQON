# ADR-0002: Logical microservices, deployed by phase
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
11 boundaries required but complexity must be justified.

## Decision
Keep all boundaries in code/schema; deploy only services needed per phase.

## Consequences
Low rewrite risk; some services co-deploy early.
