# ARQON — Arjun + Qualified Onboarding Network
**AI-Assisted Coding Examination, Recruitment Assessment & Proctoring SaaS**

[![Java](https://img.shields.io/badge/Java-21%20LTS-orange)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.1-green)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.3-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.6-blue)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-purple)](https://vitejs.dev/)

---

## 1. System Overview

ARQON (**Arjun + Qualified Onboarding Network**) is a secure, scalable, multi-tenant B2B coding examination, technical recruitment assessment, and proctoring SaaS platform for IT enterprises, recruiters, and educational institutions.

### Three Connected Portals
1. **Platform Super Admin Portal (`/super-admin`):**
   - Platform overview dashboard and live operational telemetry.
   - Organization and tenant management with instant lifecycle status activation/suspension.
   - Initial tenant admin provisioning.
   - Supported code execution runtime and quotas overview.
2. **Organization / Recruiter Portal (`/admin`, `/recruiter`):**
   - Question bank management: Coding (public & hidden test cases) and MCQ with immutable versioning.
   - Assessment creation, configuration (timings, marks, penalties), preview, and publish-freezing.
   - Candidate invitation workflows via secure, single-use token links.
   - Submission tracking, scoring breakdowns, candidate reports, and proctoring reviews.
3. **Candidate Examination Portal (`/invite/:token`, `/exam`):**
   - Secure invitation acceptance and validation.
   - Timed examination environment with Monaco code editor.
   - Server-authoritative timer (clock countdown anchored strictly on server deadline).
   - Real-time debounced autosave with optimistic concurrency control.
   - Automatic submission on timer expiration and recovery after page refresh.

---

## 2. Technology Stack

- **Backend:** Java 21 LTS, Spring Boot 3.4.1, Spring Security, Spring Data JPA, Hibernate 6, Flyway, ArchUnit.
- **Frontend:** React 19, TypeScript, Tailwind CSS, Monaco Editor, TanStack React Query v5, React Hook Form, Zod, Vite 8.3.
- **Persistence & Security:** PostgreSQL 18.6 with Row-Level Security (RLS), Argon2id password hashing, RS256 asymmetric JWT authentication.
- **Testing:** JUnit 5, Mockito, AssertJ, ArchUnit, Vitest.

---

## 3. Quick Start & Local Execution

### Prerequisites
- JDK 21 LTS (`java`, `javac`)
- Apache Maven 3.9+
- Node.js 20+ & npm
- PostgreSQL 18.6+ running on port 5433 (or custom port via `DB_PORT`)

### 1. Build and Run Tests
```powershell
# Run backend tests (43 unit & ArchUnit rules pass)
mvn test

# Run frontend tests (37 Vitest tests pass)
cd frontend/arqon-web
npm test
npm run build
cd ../..
```

### 2. Configure Environment Variables
```powershell
$env:DB_HOST = "localhost"
$env:DB_PORT = "5433"
$env:DB_NAME = "arqon"
$env:DB_APP_USERNAME = "arqon_app"
$env:DB_APP_PASSWORD = "change_me_local_app"
$env:DB_MIGRATION_USERNAME = "arqon"
$env:DB_MIGRATION_PASSWORD = "change_me_local"

# Initial Super Admin Provisioning (Arjun Shinde)
$env:ARQON_BOOTSTRAP_ADMIN_NAME = "Arjun Shinde"
$env:ARQON_BOOTSTRAP_ADMIN_EMAIL = "arjunnshinde9@gmail.com"
$env:ARQON_BOOTSTRAP_ADMIN_PASSWORD = "YourSecurePassword123!"
```

### 3. Start Backend Services
```powershell
mvn spring-boot:run -pl services/arqon-core
```
Verify endpoints:
- Ping: `http://localhost:8081/api/v1/system/ping`
- Actuator Health: `http://localhost:9081/actuator/health/readiness`
- Platform Overview: `http://localhost:8081/api/v1/platform/overview`

### 4. Start Frontend
```powershell
cd frontend/arqon-web
$env:API_TARGET = "http://localhost:8081"
npm run dev
```
Open `http://localhost:5173/login` in your browser.
Sign in with `arjunnshinde9@gmail.com` and your configured password to access the **Platform Super Admin Portal**.

---

## 4. Documentation Index

- [Architecture & Service Matrices](file:///C:/Users/Admin/Downloads/ARQON/docs/architecture.md)
- [Data Model & Schema Ownership](file:///C:/Users/Admin/Downloads/ARQON/docs/data-model.md)
- [Security & Threat Model](file:///C:/Users/Admin/Downloads/ARQON/docs/security.md)
- [Proctoring Architecture & Policy](file:///C:/Users/Admin/Downloads/ARQON/docs/proctoring.md)
- [Deployment & AWS Standards](file:///C:/Users/Admin/Downloads/ARQON/docs/deployment.md)
- [Operational Procedures & Disaster Recovery](file:///C:/Users/Admin/Downloads/ARQON/docs/operations.md)
- [Load Testing & Concurrency Analysis](file:///C:/Users/Admin/Downloads/ARQON/docs/load-testing.md)
- [Implementation Status & Verification Log](file:///C:/Users/Admin/Downloads/ARQON/docs/implementation-status.md)
- [Architecture Decision Records (ADRs)](file:///C:/Users/Admin/Downloads/ARQON/docs/decisions/README.md)
