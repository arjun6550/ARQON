# ADR-0001: Monorepo
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
Many services, shared contracts, single owner/small team.

## Decision
One Git repo; Maven multi-module for Java, npm for web.

## Consequences
Atomic cross-service changes; need path-based CI to avoid building everything.
