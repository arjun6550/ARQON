# ADR-0023: Candidate invitations (hashed link tokens, after-commit e-mail)

Status: Accepted (Slice 1.4)

## Context
Recruiters invite candidates to a published assessment by e-mail. The link is a bearer secret that, in the next slice, will
start an exam session. Candidates have no account, so the first request is unauthenticated.

## Decision
- **Token**: 32 random bytes (SecureRandom), URL-safe base64 (43 chars). Only the **SHA-256 hash** is stored (`invitation.invitations.token_hash`, unique). The raw token exists only in the e-mailed link and in an in-memory event. A database leak therefore cannot be used to open invitations; tokens are high-entropy so a plain hash is sufficient (no password-style KDF needed).
- **Link**: `{baseUrl}/invite#{token}`. The token is in the URL *fragment*, which browsers never send to servers, proxies or access logs; the SPA reads it, strips it from the address bar, and POSTs it in a body to `/api/v1/public/invitations/resolve`.
- **Resolve** is public (permitAll), rate limited, `Cache-Control: no-store`, and returns the same generic 404 for unknown, malformed, expired, revoked and replaced tokens (no enumeration). It looks up by hash under system RLS and takes the tenant from the stored row, never from the caller. It returns only what the candidate needs (title, window, duration, requirements) and a masked e-mail.
- **Lifecycle**: stored `PENDING/OPENED/REVOKED`; `EXPIRED` is derived from `expires_at` (default = assessment window end; never later). Resend **rotates** the token (the old link dies immediately). One non-revoked invitation per (assessment, e-mail) via a partial unique index; duplicates are reported, not errors.
- **E-mail**: sent **after commit** (`@TransactionalEventListener(AFTER_COMMIT)`), so a rolled-back invitation never mails. Outcome (SENT/FAILED) is recorded in a new transaction; failure never fails the API call and the recruiter sees it and can resend. Mailer is an interface (SMTP when `spring.mail.host` is set; logging placeholder otherwise; prod refuses to start without SMTP).
- **Audit + outbox**: `invitation.created/resent/revoked/opened` audited; `invitation.created/revoked` written to the module outbox in the same transaction. Payloads never contain tokens.
- **Boundaries**: invitation talks to assessments only through `AssessmentApi` (ArchUnit enforced); the invitation module has its own schema and Flyway history.

## Consequences / known limits (PLACEHOLDER / NOT PRODUCTION READY)
- E-mail sending is synchronous after commit (bounded by SMTP timeouts). Production should use a queue/worker fed by the outbox, with retries and bounce handling.
- The public rate limiter is in-memory per instance; production needs the gateway's Redis limiter / a shared limiter, plus bot protection.
- Resolving does not consume the token: the candidate may reopen the link until it expires. Single-use / device binding happens when the exam session starts (Slice 1.5).
- No reminders, bulk CSV import or custom e-mail templates yet.
