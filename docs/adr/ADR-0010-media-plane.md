# ADR-0010: Separate media plane with LiveKit SFU + S3 egress
Status: Proposed (needs approval)
Date: 2026-10-05

## Context
Video must not pass Spring APIs.

## Decision
WebRTC to SFU, TURN, egress to encrypted S3; Spring handles authz/metadata.

## Consequences
Extra infra to operate; scalable.
