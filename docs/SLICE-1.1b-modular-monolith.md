# Slice 1.1b — Restructure to a modular monolith (`arqon-core`)

## What changed
- `identity-service` + `organization-service` -> one app **`services/arqon-core`** (port **8081**, management 9081).
- Modules: `com.arqon.core.identity` (schema `identity`) and `com.arqon.core.organization` (schema `org`). One Flyway run per module (own folder + history table) in `config/FlywayConfig`.
- Cross-module call: identity validates a SUPER_ADMIN-supplied `tenantId` through `organization.OrganizationApi` (closes the "tenant existence not verified" gap).
- `ModuleBoundaryTest` (ArchUnit) fails the build if identity touches organization internals or organization touches identity.
- Ping moved to `GET /api/v1/system/ping`. Gateway has a single route `/api/v1/** -> arqon-core`.
- Frontend unchanged apart from the ping path; `API_TARGET` lets it bypass the gateway.
- API, JWT, RLS, RBAC and audit behaviour are unchanged. New ADR-0020.

## Run (minimum: Postgres + ONE app + frontend)
```powershell
cd infra\docker
copy .env.example .env
docker compose --env-file .env down -v          # needed once: DB role is created only on a fresh volume
docker compose --env-file .env up -d postgres    # add redis/jaeger/etc. only if you want them

cd ..\..
mvn -B install -DskipTests                       # builds shared/common, shared/security, arqon-core, gateway
```
Run **`ArqonCoreApplication`** (Eclipse: Run As > Spring Boot App; or `cd services\arqon-core; mvn spring-boot:run`).

Frontend, straight to the core app (no gateway/Redis needed):
```powershell
cd frontend\arqon-web
npm install
$env:API_TARGET="http://localhost:8081"; npm run dev
```
Open http://localhost:5173/login — `admin@arqon.local` / `ChangeMe-Local-12345!` (LOCAL ONLY).

Optional gateway (rate limiting): `docker compose ... up -d redis`, run `ApiGatewayApplication`, then start the frontend WITHOUT `API_TARGET`.

## Eclipse tips
- Import the **root** `arqon` folder (File > Import > Maven > Existing Maven Projects) so `arqon-common`, `arqon-security`, `arqon-core` and the gateway all resolve; run Maven `clean install -DskipTests` on `arqon-parent` once.
- Use **JDK 21** (project target). Set it in Preferences > Java > Installed JREs and in each Run Configuration's JRE tab.

## Verify
Same walkthrough as docs/SLICE-1.1.md (super admin creates org + admin; admin adds recruiter; cross-tenant isolation). New check: as SUPER_ADMIN, creating a user with a random `tenantId` returns 400 `VALIDATION_ERROR`.
Tests: `mvn test` (unit + module-boundary), `mvn verify` (adds Testcontainers ITs; Docker required), `cd frontend\arqon-web; npm test`.

## Honest status
Frontend tests/build pass here. The backend is still **not compiled or run** by me (no Maven Central access); Java files pass a syntax-only check. Run `mvn -B verify` and send me any errors.

## Interview explanation
"I started with a modular monolith: one deployable with strictly separated modules, each owning its package, DB schema and migrations, talking only through published interfaces - enforced by an ArchUnit test in the build. That keeps the MVP simple to run and debug, while tenant isolation (Row-Level Security), JWT and RBAC are already production-grade. I only split out the parts with a real reason: code execution (hostile code needs isolated nodes) and proctoring/media (video infrastructure). Because modules are decoupled, extracting a hot one later is a mechanical change."
