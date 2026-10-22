# ADR-0009: Execution sandbox: Firecracker target, gVisor bridge
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
Hostile code needs strong isolation.

## Decision
Dedicated isolated nodes, microVM/gVisor, seccomp, no network, ephemeral per job.

## Consequences
Higher ops cost; specialised security review.
