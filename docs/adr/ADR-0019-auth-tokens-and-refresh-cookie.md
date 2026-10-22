# ADR-0019: Access JWT in memory, rotating refresh token in an HttpOnly cookie
Status: Proposed (implements decision #4 of doc 00)
Date: 2026-10-06

## Decision
- Access token: RS256 JWT, 10 min, claims sub, tenant_id, role, sid, iss, aud, jti. Validated by every service (JWKS) incl. issuer + audience. Kept in SPA memory only.
- Refresh token: 256-bit random, only SHA-256 stored, 12 h absolute lifetime, rotated on every use, scoped to Path=/api/v1/auth, HttpOnly, SameSite=Strict, Secure (off only on local http).
- Reuse of a rotated token revokes the whole family (theft signal). Logout revokes the family.
- Cookie endpoints require a custom header X-ARQON-CSRF (cross-site requests cannot add it without a CORS preflight).
- Passwords: Argon2id. Login errors are generic; unknown users cost the same hashing time. 5 failures lock the account for 15 min.
- Roles map to permissions in code (RolePermissions); authorities PERM_* are checked with @PreAuthorize in each service.

## Consequences
Tokens carry no PII beyond ids. A role change takes effect when the access token expires (<=10 min); a permissions-version claim can tighten this later. The SPA must dedupe concurrent refreshes (done in auth.tsx).
