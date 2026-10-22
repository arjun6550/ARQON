# 00 — Ambiguities in the spec and recommended (safest) options
Please approve or override each. **[ARCH]** = materially affects architecture.

| # | Ambiguity | Recommendation | Why |
|---|-----------|----------------|-----|
| 1 **[ARCH]** | 11 microservices from day one vs fewer deployables for MVP | Keep all 11 logical **boundaries** (separate Maven modules, separate schemas, API/event-only coupling) but **deploy only what each phase needs**. Phase 1 deploys: gateway, identity, organization, assessment, question-bank, invitation, exam-session, evaluation, reporting-lite. Code-execution and proctoring come in their phases. Assessment + Question Bank may co-deploy initially. | Spec says "no unnecessary microservices" yet lists 11. Boundaries-first avoids rewrites; deploy-later avoids ops cost. |
| 2 **[ARCH]** | Phase 1 wants "basic automated evaluation" of coding, but secure execution is Phase 2 | In Phase 1: MCQ is auto-scored. Coding answers are stored, versioned and shown to reviewers. Coding auto-evaluation is a stub labelled **PLACEHOLDER / NOT PRODUCTION READY** that never runs code. | Spec forbids running candidate code in the Spring process. |
| 3 **[ARCH]** | Sandbox technology | Target: **Firecracker microVMs** on dedicated bare-metal/virt-capable nodes. Bridge: **gVisor (runsc)** on an isolated node pool. Local dev: rootless container + seccomp, flagged non-production. | Containers share a kernel; hostile code needs a stronger boundary. |
| 4 **[ARCH]** | Token/session model | Access JWT (10 min) + rotating opaque refresh token in HttpOnly/Secure/SameSite cookie, reuse detection; server-side session rows. Candidates get an exam-scoped token bound to session id. | XSS resistance, revocation, one-active-session policy. |
| 5 **[ARCH]** | Tenant isolation in shared DB | `tenant_id` on all tenant rows + **PostgreSQL Row-Level Security** + Hibernate filter; tenant only from verified token. | App-level filtering alone is one bug from a leak. |
| 6 | Build vs buy identity | Build Identity Service (spec) behind an `IdentityProvider` abstraction; evaluate Keycloak for SAML/OIDC in Phase 9. | SAML is large; keep an exit. |
| 7 | Kafka local mode | KRaft single broker. | Simpler than ZooKeeper. |
| 8 | Write-load assumptions | 5,000 sessions x 1 autosave/5 s ≈ 1,000 writes/s; proctoring events batched every 5–10 s. Autosave = upsert latest draft + versioned snapshot only at milestones (run/save/submit/nav), not every keystroke. **Must be validated by load test.** | Keeps Postgres realistic. |
| 9 | Proctoring event path | Browser batches → Proctoring Service (HTTPS/WS) → Postgres + outbox → Kafka. | Not every event needs sync Kafka. |
| 10 | Recording | WebRTC → LiveKit SFU → LiveKit Egress → S3. Webcam (+ optional audio) only. Screen recording is **not** in the spec, so not included. | Matches spec. |
| 11 | Face/ID verification | Optional per assessment, provider-abstracted. No continuous face recognition, no emotion inference. Needs legal/consent review. | Spec says avoid unnecessary facial recognition. |
| 12 | Region / data residency | Assume AWS ap-south-1 (Mumbai) primary, DR in ap-southeast-1. Confirm. India DPDP Act consent and retention apply to recordings. | Unspecified in spec. |
| 13 | Scoring formula config | Versioned JSON scoring policy (weights/rules), no arbitrary scripting. | Avoids RCE via formulas. |
| 14 | Result edits | Results append-only versioned; edits create new version + audit record. | Audit requirement. |
| 15 | Build tooling | Maven multi-module (Java), npm/Vite (frontend). Shared = contracts + tiny cross-cutting starters (tenant context, error model, logging) only. | "No business logic in shared". |
| 16 | Event schema format | JSON Schema + versioned envelope now; Avro + registry later if needed. | Simplicity first. |
| 17 | Where proctor/recruiter see candidate PII | PII minimization; candidate identity pseudonymised in analytics read models. | Privacy. |
| 18 | Mass-start thundering herd | Session start is idempotent, jittered client retry, pre-warmed caches of assessment config, queued admission if DB pool saturates. | Spike test target in Phase 10. |
