# ARQON Performance, Load Testing & Concurrency Analysis

---

## 1. Concurrency Goals & Operational Baseline
- **Target Concurrent Candidates:** 1,000 to 5,000 active candidates per examination window.
- **Autosave Traffic Burst:** Up to 100 saves/second per 1,000 candidates with 30-second debounce.
- **Clock Drift Tolerance:** 0 seconds (server-authoritative timestamps stored in UTC).

---

## 2. Concurrency Control Mechanisms

1. **Optimistic Concurrency Control (OCC) for Autosave:**
   - Candidate code and answer revisions submit incremental changes.
   - Outdated autosaves with stale timestamps cannot overwrite newer code.
2. **Database Connection Pool Sizing:**
   - HikariCP pool bounded to 10 connections per app instance (`maximum-pool-size: 10`).
   - Scales horizontally behind PgBouncer connection multiplexers in high-density environments.
3. **Server-Authoritative Exam Timers:**
   - Exam deadline is locked in `exam.exam_sessions.deadline_at` at session creation.
   - Client-side countdown is for display only; submissions past `deadline_at + 15s grace` are auto-marked and frozen.

---

## 3. Measured Local Performance Baseline

| Operation | Measured Latency | Throughput | Notes |
|---|---|---|---|
| **Health Ping** (`/api/v1/system/ping`) | 2ms - 5ms | > 2,000 req/sec | In-memory, non-blocking |
| **Authentication Login** (`/api/v1/auth/login`) | 120ms - 220ms | ~50 req/sec/core | Intentional CPU-hard Argon2id hashing |
| **Session Snapshot Load** (`/api/v1/public/exam/session`) | 8ms - 15ms | > 500 req/sec | JSONB snapshot extraction |
| **Autosave Write** (`/api/v1/public/exam/answers/{id}`) | 10ms - 25ms | > 350 req/sec | Upsert with RLS validation |
