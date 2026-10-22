# Slice 1.1 — Organizations + recruiter login (identity, tenancy, RBAC)

> **Superseded run instructions:** identity and organization are now modules of one app (`arqon-core`, port 8081). See docs/SLICE-1.1b-modular-monolith.md for how to run it. The API, security design and verification steps below are unchanged.

## 1. Objective
Real authentication and tenant isolation: password login, JWT access + rotating refresh cookie, RBAC with permissions, organization-service, Row-Level Security, audit trail, and the login/portal UI.

## 2. Architecture
```mermaid
sequenceDiagram
  participant B as Browser
  participant G as Gateway
  participant I as Identity
  participant O as Organization
  participant DB as Postgres (RLS)
  B->>G: POST /auth/login
  G->>I: forward
  I->>DB: asSystem -> find user, verify Argon2id, store refresh hash
  I-->>B: access JWT (body) + refresh cookie
  B->>G: GET /organizations/me (Bearer)
  G->>O: forward
  O->>O: validate JWT via Identity JWKS (iss, aud, exp); TenantContext from token
  O->>DB: asTenant(token tenant) -> RLS filters rows
  O-->>B: own organization only
```
New/changed: `shared/security` (Role, Permission, JWT validation, tenant filter), `shared/common` (RlsSession, PageResponse), `services/identity-service` (users, auth, audit), `services/organization-service` (new), gateway routes, compose init script (non-owner DB role), React auth + portals.

## 3. Key decisions (see ADR-0018, ADR-0019)
RLS with non-owner runtime role; access JWT in memory + HttpOnly rotating refresh cookie with reuse detection; Argon2id; lockout; permissions in code; tenant only from verified token; cross-tenant reads return 404.

## 4. API
| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | /api/v1/auth/login | public | sets refresh cookie; generic 401 |
| POST | /api/v1/auth/refresh | cookie + X-ARQON-CSRF | rotates |
| POST | /api/v1/auth/logout | cookie + X-ARQON-CSRF | 204 |
| GET | /.well-known/jwks.json | public (internal) | public keys only |
| GET | /api/v1/users/me | authenticated | |
| GET | /api/v1/users?page&size | USER_READ | tenant-scoped by RLS |
| POST | /api/v1/users | USER_CREATE / USER_CREATE_ANY_TENANT | ORG_ADMIN: own tenant only; SUPER_ADMIN must pass tenantId; roles ORG_ADMIN/RECRUITER/PROCTOR |
| POST | /api/v1/organizations | ORGANIZATION_CREATE (SUPER_ADMIN) | 409 duplicate slug |
| GET | /api/v1/organizations | ORGANIZATION_READ_ALL | paged |
| GET | /api/v1/organizations/me | ORGANIZATION_READ_OWN | |
| GET | /api/v1/organizations/{id} | READ_OWN / READ_ALL | other tenant => 404 |

## 5. How to run
```bash
cd infra/docker && cp .env.example .env
# IMPORTANT if you ran Slice 1.0 before: the DB role is created by an init script that only runs on a fresh volume
docker compose --env-file .env down -v
docker compose --env-file .env up -d && cd ../..

mvn -B install -DskipTests
(cd services/identity-service     && mvn spring-boot:run)   # :8081
(cd services/organization-service && mvn spring-boot:run)   # :8082
(cd services/api-gateway          && mvn spring-boot:run)   # :8080
(cd frontend/arqon-web && npm install && npm run dev)       # :5173
```
Tests: `mvn test` (unit) · `mvn verify` (adds Testcontainers ITs; Docker required) · `cd frontend/arqon-web && npm test`.
Local bootstrap login: `admin@arqon.local` / `ChangeMe-Local-12345!` (LOCAL ONLY; prod has no default).

## 6. Verification walkthrough (browser)
1. http://localhost:5173/login as the bootstrap admin -> Super Admin Portal.
2. Create organization "Acme" / `acme`; create an organization admin for Acme (12+ char temp password).
3. Sign out; sign in as that admin -> Admin Portal shows "Acme"; add a recruiter.
4. Sign in as the recruiter -> Recruiter Portal shows "Acme"; opening /admin shows "no access".
5. Create a second org + admin; confirm each admin only sees their own team.

## 7. Verification (curl / DB)
```bash
curl -s -c jar -H 'Content-Type: application/json' -d '{"email":"admin@arqon.local","password":"ChangeMe-Local-12345!"}' localhost:8080/api/v1/auth/login
curl -i localhost:8080/api/v1/users                    # 401 UNAUTHENTICATED JSON
curl -i -b jar -X POST localhost:8080/api/v1/auth/refresh                          # 403 (no CSRF header)
curl -i -b jar -c jar -H 'X-ARQON-CSRF: 1' -X POST localhost:8080/api/v1/auth/refresh   # 200, new cookie
# replay an OLD cookie -> 401 and the whole session family is revoked
docker compose -f infra/docker/docker-compose.yml exec postgres psql -U arqon_app -d arqon -c "select count(*) from identity.users"   # 0 (RLS fails closed)
docker compose -f infra/docker/docker-compose.yml exec postgres psql -U arqon -d arqon -c "select action, count(*) from identity.audit_events group by 1"
```

## 8. Honest status
- Frontend: `npm test` (10 tests) and `npm run build` pass here.
- Backend: Java files pass a syntax-only check, but **nothing was compiled or run** (no Maven Central access in my environment). Please run `mvn -B verify` (Slice 1.0 + 1.1 together) and send me any errors; I'll fix before Slice 1.2.
- Not done yet / known limits: no Kafka publisher yet (outbox tables exist, no events written); identity does not verify that `tenantId` exists in organization-service (arrives with events); admins set a temporary password manually (invite-by-email in Phase 8); no MFA/OAuth yet (Phase 9); no password change/reset; login rate limit relies on gateway + per-account lockout; audit is write-only (no read API); IP in audit is the gateway's address until X-Forwarded-For handling is added; no Dockerfiles yet.

## 9. Interview explanation
"Authentication and tenancy are designed so one bug can't leak data. The Identity service issues short-lived RS256 JWTs (tenant, role, session) and keeps a rotating, hashed refresh token in an HttpOnly SameSite cookie; replaying an old refresh token revokes the whole family. Every service validates tokens itself against Identity's JWKS, including issuer and audience, so the gateway isn't the only boundary. The tenant comes only from the verified token into a TenantContext, and PostgreSQL Row-Level Security is the safety net: the app connects as a non-owner role and sets a transaction-scoped tenant variable, so a missing filter returns zero rows instead of another tenant's data. I proved that with integration tests against real Postgres, including cross-tenant reads returning 404. Passwords use Argon2id with generic errors, equal-cost lookups and lockout, and every security-relevant action writes an audit event."
