# ADR-0024: Exam sessions - server-authoritative time, snapshot, opaque session token

Status: Accepted (Slices 1.5-1.9)

## Decisions
- **Start** = `POST /api/v1/public/exam/start {inviteToken}`. Allowed only inside the assessment window. Deadline = window end (FIXED) or min(now + duration, window end) (FLEXIBLE), computed once and stored; a DB trigger forbids changing deadline, start time and snapshot.
- **One session per invitation** (unique index). Calling start again resumes the same session and **rotates the session token**: only the latest device can write. After submit, start returns 409.
- **Session token**: 32 random bytes, only the SHA-256 is stored, sent in `X-Exam-Session` (never in a URL). The tenant always comes from the stored row.
- **Snapshot**: at start the session copies title, scoring and the exact pinned question versions (incl. correct answers and hidden-test counts) into JSONB. Later edits/archiving of questions never change a running or finished exam. Candidates receive a stripped view (no `correct`, no hidden tests).
- **Server clock wins**: every save/submit/view checks the deadline (+5 s latency grace). Overdue sessions are auto-submitted lazily on access and by a scheduled sweep, so closing the browser still ends the exam. The browser only displays a countdown derived from the server's `serverNow`.
- **Autosave**: one JSONB row per (session, question), upsert; a trigger rejects writes once the session is finished. MCQ answers validated against the snapshot (indexes, single vs multiple); coding answers store language + source (max 100k chars) and are **never executed** by this service.
- **Grading**: MCQ all-or-nothing on the exact set; result stored on finish. **Coding is NOT evaluated (PLACEHOLDER / NOT PRODUCTION READY)**: status `NOT_EVALUATED`, total is provisional (MCQ percent x MCQ weight), `passed` unknown when coding exists. Secure execution is a separate sandboxed service (Phase 2).
- **Results** for recruiters/admins: `RESULT_READ`, tenant-scoped, 404 across tenants.
- Audit + outbox rows (`exam.started`, `exam.submitted`, ...) are written transactionally; relay to Kafka comes later.

## Known limits
Recovery policy details (grace seconds, max recoveries) and integrity/proctoring signals (fullscreen, tab switch, camera) are stored in the assessment but **not enforced yet**. Sweep is single-node (no distributed lock). No per-section timers, shuffling, or candidate result view.
