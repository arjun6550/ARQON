# ADR-0021: Questions are logical records with immutable, JSON-content versions
Status: Proposed (implemented in Slice 1.2)
Date: 2026-10-07

## Context
Assessments, scoring and audits must keep working when a question is later edited. Question types will grow (SQL, more coding options). Hidden test cases must never leak.

## Decision
- `questions` holds identity, tags, status and `current_version`; `question_versions` holds the full content and is append-only (no setters in the entity, DB trigger rejects UPDATE/DELETE). Editing = inserting version n+1 with optimistic concurrency (`expectedVersion` + unique(question_id, version)).
- Type-specific content (MCQ options, coding spec with test cases) is a JSONB column validated by Bean Validation + `QuestionContentValidator`. A new question type adds an enum value, a content record and validator rules, not a migration.
- Archiving is a soft delete; archived questions stay readable by id so assessments referencing (question_id, version) remain valid.
- Author-facing views include correct answers and hidden tests; candidate-facing views will be separate types (exam-session slice) so exposure is a compile-time decision, not a flag.
- Tenant isolation: tenant_id on every row, RLS, tenant only from the verified token; other tenants' ids return 404.
- Platform SUPER_ADMIN has no question permissions by default (no access to tenant content).

## Consequences
List/search uses denormalised title/difficulty/tags on `questions` (GIN index on tags). Searching inside test cases or options is not supported (and not needed). JSON content cannot be queried relationally; if analytics on options is needed later, project it through events into the reporting module.
