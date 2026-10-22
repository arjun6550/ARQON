# 05 — Repository structure, phases, MVP vertical slices

## Repository structure
```
arqon/
├── frontend/arqon-web/              React+TS+Tailwind+Router+TanStack Query+RHF+Zod+Monaco (portals: recruiter, org-admin, proctor, candidate, super-admin)
├── services/<11 services>/          each: Spring Boot, src/main (api|application|domain|infrastructure), db/migration (Flyway), Dockerfile
├── execution/{workers,sandboxes,language-runtimes}
├── media/                           LiveKit config, egress, TURN
├── shared/{api-contracts,event-contracts,common}
├── infra/{docker,kubernetes,terraform,monitoring}
├── docs/{architecture,api,security,adr}
└── .github/workflows/
```
Service layout (clean architecture, pragmatic): `api` (controllers, DTOs) → `application` (use cases) → `domain` → `infrastructure` (JPA, Kafka, Redis). Parent `pom.xml` with BOM; Flyway migrations per service schema.

## Phases
| Phase | Scope |
|---|---|
| 0 | This foundation, ADRs, repo, CI skeleton, local infra |
| 1 | MVP (below) |
| 2 | Secure code execution (queue, workers, gVisor→Firecracker, quotas) |
| 3 | Advanced evaluation (weights, performance, quality, SQL) |
| 4 | Proctoring (browser signals, LiveKit, recording) |
| 5 | AI risk scoring |
| 6 | Human review workflow |
| 7 | Org analytics |
| 8 | Notifications |
| 9 | Enterprise auth + integrations (SSO, SAML, webhooks, API keys) |
| 10 | AWS/EKS, observability hardening, load/security testing, DR drills |

Observability baseline (logs, metrics, tracing, correlation id) starts in slice 1, not at the end.

## MVP vertical slices (Phase 1)
| Slice | Frontend | Backend | Done when |
|---|---|---|---|
| 1.0 Platform skeleton | app shell, routing, API client, error UI | gateway, common starters (error model, tenant context, correlation), Flyway, health, local compose | all services start via compose, `/health` green, traces visible |
| 1.1 Org + recruiter login | login, org setup | identity (pwd+JWT+refresh, RBAC), organization | recruiter logs in; cross-tenant test passes |
| 1.2 Question bank | question forms (MCQ, coding) | question-bank (versions, options, tests) | create/version MCQ + coding question |
| 1.3 Assessment creation | assessment wizard | assessment (sections, schedule, policies) | publish assessment with window+duration |
| 1.4 Invitations | invite UI | invitation (hashed tokens, expiry) | candidate link resolves once, audited |
| 1.5 Exam session core | candidate shell, server timer display | exam-session (start, timer, resume) | timer survives refresh/reconnect |
| 1.6 MCQ + autosave | MCQ UI | answers with version/seq OCC | stale write rejected (tested) |
| 1.7 Coding + Monaco | Monaco, language pick, drafts | code drafts + versions (**no execution**) | draft restored after reconnect |
| 1.8 Submit + evaluation | submit flow | evaluation MCQ score; coding stub **PLACEHOLDER / NOT PRODUCTION READY** | idempotent submit, MCQ score correct |
| 1.9 Result dashboard | recruiter results table | reporting-lite read model via events | results appear via outbox→Kafka→projection |

Each slice ships: UI, API (OpenAPI), migrations, unit+integration (Testcontainers), security/authz tests, metrics/logs.
