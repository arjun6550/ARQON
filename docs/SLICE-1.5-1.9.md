# Slices 1.5-1.9 - Taking the exam, autosave, submit, grading, results (one delivery)

## 1. What you get
Candidate: invitation link -> **Start exam** -> timed exam page (MCQ + Monaco code editor, autosave, question navigator, countdown from the SERVER clock, submit). Recruiter/Admin: **Results** page per published assessment with MCQ scores and answer details. Design: ADR-0024.

## 2. API
| Method | Path | Notes |
|---|---|---|
| POST | /api/v1/public/exam/start | `{token}` (invitation link token) -> session view + `sessionToken`; 409 before/after window or when already submitted |
| GET | /api/v1/public/exam/session | header `X-Exam-Session`; finished sessions return no questions |
| PUT | /api/v1/public/exam/answers/{questionId} | `{answer:{selected:[..]}}` or `{answer:{language,code}}`; 409 once time is over |
| POST | /api/v1/public/exam/submit | idempotent |
| GET | /api/v1/assessments/{id}/results | `RESULT_READ` (ORG_ADMIN, RECRUITER) |
| GET | /api/v1/results/{sessionId} | per-question detail incl. code |

## 3. Run
Same as Slice 1.4 (new `exam` schema migrates automatically; `npm install` once for `@monaco-editor/react`, the editor itself loads from a CDN at runtime, so the browser needs internet).

## 4. Verify (browser)
1. Recruiter: question bank (an MCQ + a coding question) -> assessment with a window that includes "now" -> Publish -> Invitations -> send to your own address (see Mailpit http://localhost:8025).
2. Open the link in a private window -> Start exam. Answer the MCQ, write code, watch "all changes saved". Reload the page: answers are still there. Open the invite link again in another tab: the old tab can no longer save (token rotated).
3. Submit. The page shows "Exam submitted". Recruiter -> Assessments -> **Results**: MCQ score, "coding: answered, not evaluated", provisional %, Details with the submitted code.
4. Timer test: create an assessment with a FIXED window ending in ~6 minutes (window must be >= 5 min), start it, wait: the exam auto-submits when time ends (page shows "Time is up").

## 5. Tests
`mvn test`: `GraderTest`, `ExamValidationTest`, new ArchUnit rules. `mvn verify`: `ExamIT` (full candidate flow, answer overwrite/validation, no answer leakage, submit finality, resume + token rotation, overdue auto-submit with the DB deadline moved back, sweep, window checks, fixed-window deadline, tenant isolation, permissions). `npm test`: 34 tests; tsc + build pass.

## 6. Honest status
- Backend **not compiled or run by me** (no Maven Central in my sandbox); only syntax-checked. `mvn verify` for Slices 1.0-1.4 is still unconfirmed - please run it and send the summary. New risk areas: Hibernate JSONB mapping of `Snapshot`/`ExamResult` records, `noRollbackFor` auto-submit path, the two new triggers, `@Scheduled` sweep.
- **PLACEHOLDER / NOT PRODUCTION READY**: coding is stored but never executed or scored; no proctoring/integrity enforcement; no email OTP/ID/selfie steps (the assessment settings exist but are not enforced); single-node sweep; in-memory rate limiting only on invitation resolve.
- Remaining roadmap: secure code execution service (Phase 2), proctoring/media (Phase 4), candidate result view, reports/exports, notifications, Kafka relay for the outbox.

## Frontend upgrade (fix3)
Dark mode (toggle, remembered per browser), toasts, confirm dialogs (no more window.confirm), skeleton loaders, empty states, Ctrl/Cmd+K jump-to, staff dashboard counts, exam: flag-for-later (kept only in the candidate's browser), review-and-submit dialog, keyboard shortcuts (arrows or J/K move, F flag, 1-9 choose).
