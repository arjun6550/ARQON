# ARQON Application Security & Multi-Tenant Threat Model

---

## 1. Multi-Tenant Isolation Architecture

ARQON strictly separates data across tenants through multi-layered defense-in-depth:
1. **Application Context Layer:**
   - Client requests cannot declare arbitrary `tenant_id` parameters.
   - `TenantContext` is extracted strictly from verified asymmetric RSA-signed JWT claims.
2. **Data Access & Connection Layer (PostgreSQL Row-Level Security):**
   - The application connects using the unprivileged database role `arqon_app` (`NOBYPASSRLS`).
   - Every database transaction must declare its tenant boundary via `SET LOCAL app.tenant_id = '<uuid>'`.
   - Cross-tenant queries return zero rows, resulting in HTTP 404 (Not Found) rather than revealing existence or leaking records.
3. **Platform Super Admin Boundaries:**
   - Platform administration is segregated from tenant assessments.
   - Platform Super Admin (`Role.SUPER_ADMIN`) has no tenant ID (`tenant_id IS NULL`), can manage organizations and view system telemetry, but cannot read tenant questions, test cases, or candidate results.

---

## 2. Authentication & Credential Architecture

1. **Password Hashing:**
   - Argon2id with memory-hard parameters via `Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()`.
   - Plaintext passwords are never logged, never returned in API payloads, and never stored in repository files.
2. **Initial Platform Super Admin Provisioning:**
   - Identity: Arjun Shinde (`arjunnshinde9@gmail.com`).
   - Password read from protected environment variable `ARQON_BOOTSTRAP_ADMIN_PASSWORD`.
   - Idempotent: repeated bootstrap runs skip without overwriting existing hashes or duplicating accounts.
   - Conflict Prevention: fails fast if the email exists with a non-admin role or tenant.
3. **Session & Token Management:**
   - Access tokens: Stateless asymmetric RSA-signed JWTs (RS256). Short-lived (15 minutes).
   - Refresh tokens: Stored as SHA-256 hashes in database table `identity.refresh_tokens`, rotated on each refresh, with automatic family revocation on reuse attempts.
   - Logout: explicitly revokes token family and invalidates HTTP-only cookie.
4. **Brute Force & Lockout:**
   - Exponential delay and lockout after 5 consecutive failed login attempts (`failed_attempts` tracking with `locked_until` timestamp).

---

## 3. OWASP Top 10 Mitigation Matrix

| Vulnerability Category | Mitigation in ARQON |
|---|---|
| **A01: Broken Access Control** | Method-level security (`@PreAuthorize`) on every endpoint + PostgreSQL RLS enforcing tenant boundaries at the database level. |
| **A02: Cryptographic Failures** | Argon2id password hashing, RS256 JWT signatures, SHA-256 hashes for invitation links, exam session tokens, and refresh tokens. |
| **A03: Injection (SQL / Command)** | Spring Data JPA parameter binding, Hibernate ddl-auto validation, untrusted candidate code executed in isolated sandbox execution workers with network disabled. |
| **A04: Insecure Design** | Immutable question versions and assessment snapshots ensure examination questions and test cases cannot change during active exam runs. Server-authoritative clocks prevent client timer manipulation. |
| **A05: Security Misconfiguration** | Actuator exposure limited to health, info, prometheus. Development Swagger disabled in prod. Hikari connection pools strictly bounded. |
| **A06: Vulnerable Components** | Regular dependency audits, Java 21 LTS, Spring Boot 3.4.1, Vite 8.3.2. |
| **A07: Identification & Auth Failures** | Token rotation, refresh family invalidation, account lockout after failed attempts, strict email validation. |
| **A08: Software & Data Integrity** | Database trigger `trg_question_versions_immutable`, trigger `trg_assessments_protect`, and trigger `trg_exam_sessions_protect` guarantee state integrity. |
| **A09: Security Logging & Monitoring** | Audit event records (`identity.audit_events`, `invitation.audit_events`, `exam.audit_events`), correlation ID tracing across gateway and microservices, ECS-structured logs. |
| **A10: SSRF** | No arbitrary URL fetching by server; email links generate strict domain paths from verified base URLs. |
