# 02 — Kafka event architecture & Redis usage

## Event envelope (all events)
```json
{
  "eventId": "uuid (stable across retries)",
  "eventType": "exam.session.submitted",
  "eventVersion": 1,
  "aggregateType": "ExamSession",
  "aggregateId": "uuid",
  "tenantId": "uuid",
  "occurredAt": "2026-01-01T10:00:00Z",
  "correlationId": "uuid",
  "causationId": "uuid|null",
  "payload": { }
}
```
Kafka key = aggregateId (ordering per aggregate). Topic naming: `arqon.<domain>.<event>.v1`. Compatible-only evolution; breaking change = new version topic.

## Reliable publication (transactional outbox)
```mermaid
sequenceDiagram
  participant S as Service
  participant DB as Postgres
  participant P as Outbox Publisher
  participant K as Kafka
  participant C as Consumer
  S->>DB: BEGIN; update state; insert outbox_event; COMMIT
  P->>DB: poll unpublished (FOR UPDATE SKIP LOCKED)
  P->>K: publish (idempotent producer, acks=all, key=aggregateId)
  P->>DB: mark published
  K->>C: deliver (at-least-once)
  C->>DB: BEGIN; insert processed_events(eventId) ON CONFLICT DO NOTHING; apply; COMMIT
  C->>K: commit offset after DB commit
```
Kafka down → outbox accumulates, business flow continues. Poison messages → retry topic with backoff → DLQ + alert. Start with polling publisher; consider Debezium CDC later.

## Topic catalog (initial)
| Topic | Producer | Consumers | Sync alternative? |
|---|---|---|---|
| org.organization.created | Organization | Identity, Reporting | no |
| assessment.assessment.published | Assessment | Invitation, Reporting | no |
| qbank.question-version.published | Question Bank | Assessment | no |
| invitation.invitation.created | Invitation | Notification (later), Exam | no |
| exam.session.started / resumed / submitted / terminated | Exam Session | Evaluation, Proctoring, Reporting | start/submit ack to the user stays synchronous |
| exec.execution.requested / completed | Code Execution | Worker (queue), Exam, Evaluation | Run result returned via polling/WS |
| eval.submission.scored | Evaluation | Reporting, Exam (result visibility) | no |
| proctor.signal.recorded / risk.updated / review.requested / decision.made | Proctoring | Exam, Reporting, Notification | no |
| identity.audit / org.audit | all | Audit sink | no |
| notification.requested | many | Notification worker | no |

Not on Kafka: login, autosave ack, timer fetch, question navigation, answer save ack (all synchronous DB writes).

## Redis usage matrix
| Use | Key pattern | TTL | Source of truth? | If Redis down |
|---|---|---|---|---|
| Rate limiting (token bucket / sliding window) | rl:{scope}:{id} | window | no | fail-open for candidates on exam endpoints with local fallback limiter; fail-closed for login/OTP |
| OTP state | otp:{userId} | 5 min | Postgres hash fallback for critical flow | degrade to DB-backed OTP |
| Session lookup cache | sess:{sid} | token life | **no** (Postgres) | read-through to DB |
| Active-session lock | lock:exam:{sessionId} | short lease | **no** (DB version check authoritative) | DB optimistic lock still prevents corruption |
| Assessment/question config cache | cfg:assessment:{id}:v{n} | 5–15 min | no | DB read |
| WebSocket fan-out | pubsub channels | – | no | clients reconnect + resync from DB |
| Execution concurrency counters | exec:conc:{tenant}/{candidate} | lease | no (reconciled from DB) | fall back to DB count |
| Presence/heartbeat | hb:{sessionId} | 30–60 s | no | derived signals only |

Never in Redis only: answers, code drafts, timer start/end, scores, decisions.
