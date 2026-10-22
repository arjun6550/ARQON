# ADR-0022: Assessments pin question versions and are frozen when published
Status: Proposed (implemented in Slice 1.3)
Date: 2026-10-08

## Context
Candidates may be mid-exam while recruiters keep improving the question bank. Scoring, audits and appeals need to know exactly what each candidate was shown.

## Decision
- An assessment holds `sections[].items[] = (questionId, version, points)`; it never references "the latest" version. Pinning is validated through the question bank module's published API (`QuestionBankApi`): the question must exist, be ACTIVE and belong to the same tenant.
- Lifecycle DRAFT -> PUBLISHED -> ARCHIVED. Only drafts are editable (optimistic concurrency via a revision). Publishing re-validates everything (sections, weights, future end of window, language support) and freezes the row; a database trigger rejects changes to title/description/config/sections of published rows, forbids un-publishing and deleting. "Editing" a published assessment = copy into a new draft.
- Config (schedule, languages, integrity, scoring, visibility, recovery, identity) is validated JSONB so policy options can grow without migrations; the validator owns cross-field rules.
- Schedule semantics: FIXED_WINDOW = everyone starts at windowStart, duration equals the window (max 180 min); FLEXIBLE_WINDOW = a candidate may start any time within the window and then gets `durationMinutes` (max 180). The server is authoritative for the timer (enforced in the exam session slice).
- Scoring weights are required exactly for the section types present and must total 100 (no free-form formulas).
- Result visibility defaults hide correct answers and hidden test details.
- Module boundary: assessment depends on question bank only via `QuestionBankApi` (ArchUnit-enforced); other modules do not depend on assessment. A published `AssessmentApi` is added with the invitation slice.

## Consequences
Exams are reproducible. Archiving a question later does not break published assessments (versions stay readable) but archived questions cannot be newly pinned. Free-text formulas and per-question overrides are intentionally not supported yet.
