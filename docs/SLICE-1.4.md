# Slice 1.4 - Candidate invitations

## 1. What you get
Recruiters / org admins invite candidates to a **published** assessment by e-mail; candidates open a personal link and see what they are invited to. Starting the exam comes in Slice 1.5.

## 2. Backend (`com.arqon.core.invitation`, schema `invitation`)
| Method | Path | Notes |
|---|---|---|
| POST | /api/v1/assessments/{id}/invitations | body `{emails:[..<=100], expiresAt?}` -> 201 `{results[{email,outcome,invitationId}],created,skipped}`; outcomes CREATED / DUPLICATE / INVALID_EMAIL |
| GET | /api/v1/assessments/{id}/invitations?page&size | status PENDING/OPENED/EXPIRED/REVOKED, emailStatus PENDING/SENT/FAILED |
| POST | /api/v1/invitations/{id}/resend | new link, old one dies; 202 |
| DELETE | /api/v1/invitations/{id} | revoke; 204 |
| POST | /api/v1/public/invitations/resolve | public; body `{token}`; 404 generic message if unusable; 429 when rate limited |

Permissions `INVITATION_READ/WRITE` (ORG_ADMIN, RECRUITER). Other tenants' assessments/invitations -> 404. Design: ADR-0023.

## 3. Frontend
- Assessments list -> **Invitations** (published only): paste e-mails, live valid/invalid count, send, list with status, resend, revoke.
- `/invite#<token>`: public candidate landing (token read from the URL fragment and removed from the address bar).

## 4. Run
1. `docker compose --env-file .env up -d` (or at least `postgres mailpit`) in `infra/docker`. Mailpit = local inbox: **http://localhost:8025** (SMTP :1025).
2. Start `arqon-core` as before (new `invitation` schema migrates automatically; `spring-boot-starter-mail` is a new dependency, so run `mvn clean install -DskipTests` once / Maven > Update Project in STS).
3. Frontend `npm run dev`.

## 5. Verify (browser)
1. Recruiter: create + **publish** an assessment (window end in the future).
2. Assessments -> Invitations -> paste `a@x.io, b@x.io, bad` -> Send. Result line shows 2 created. Open Mailpit: two e-mails with a link `http://localhost:5173/invite#...`.
3. Send the same address again -> "already invited". Open the link in a private window: assessment card shows; recruiter list now shows OPENED.
4. Resend -> old link now shows "invalid or has expired", new one works. Revoke -> link dead; the address can be invited again.
5. Another organization's recruiter cannot see or touch these invitations.
If Mailpit is not running, invitations are still created with mail status **FAILED** (use Resend later); with no `spring.mail.host` at all the logging placeholder is used.

## 6. Tests
`mvn test`: `InvitationTest`, `InvitationRulesTest`, `PublicRateLimiterTest`, `TokensTest`, `SecurityVocabularyTest`, `ModuleBoundaryTest` (new rules). `mvn verify`: `InvitationIT` (7 scenarios: create/duplicate/invalid, mail failure + resend, draft rejected, resolve idempotent + no leakage, token replacement/revoke/re-invite, tenant isolation + permissions, request validation). `npm test`: 30 tests.

## 7. Honest status
- Frontend: tsc, 30 tests, production build pass here.
- Backend: syntax-only check by me; **not compiled or run** (no Maven Central in my sandbox). The `mvn verify` result for Slices 1.0-1.3 is still unconfirmed; please run it with this zip and send the summary. New risk areas: Hibernate merge of an entity with an assigned UUID id, `AFTER_COMMIT` listener + `REQUIRES_NEW` template, `spring-boot-starter-mail` autoconfig.
- Limits (PLACEHOLDER / NOT PRODUCTION READY): synchronous e-mail, in-memory rate limit, link not single-use yet (see ADR-0023).

## 8. Interview explanation
"The invitation link is a bearer secret, so we store only its SHA-256 and put the raw token in the URL fragment so it never reaches server logs. The public resolve endpoint returns one generic error for every bad-token case, so it can't be used to probe. E-mail goes out only after the database commit, and a failed send is recorded and retryable instead of failing the request. Cross-module data (what the assessment is) comes through a published interface that an architecture test enforces."
