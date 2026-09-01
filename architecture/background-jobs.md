# Background Jobs, Reliability, Notifications & Interviews

## Background Jobs

Use Redis for asynchronous jobs. Potential queues:

```
resume.parse
application.rank
notification.send
```

Add future queues only when needed. Workers should be separate execution
processes from the API where practical.

## Reliability

Assume jobs can fail, timeout, retry, and execute more than once. Important
jobs should be idempotent:

```
Job → Worker starts → Worker crashes → Job retries → Worker runs again
```

The second execution should not corrupt business state. Do not assume
exactly-once processing.

## Notifications

Notifications are side effects:

```
Application Stage Changed
          │
          ▼
     Queue Job
          │
          ▼
 Notification Worker
          │
      ┌───┴─────────┐
      ▼             ▼
   In-App          Email
      │
      ▼
 Redis Pub/Sub ──► SSE (open browser tabs)
```

**Delivery to the browser is push (SSE) with poll as a fallback, not
poll-only.** The notification worker runs in a separate OS process from
the API — when it creates a `Notification` row, the API process (which
holds any open SSE connections) has no way to know unless told. Redis,
already in the stack for BullMQ, is the bridge: the worker publishes to
a `notification.created` channel after processing each job (best
effort — a publish failure is logged and swallowed, not retried, since
the row and email are already correct either way); `NotificationStreamHub`
in the API process holds one shared subscriber connection and fans
events out to open `GET /notifications/stream` connections by user id.
The frontend's 30s poll (`useNotifications`) stays in place underneath
this as a reconciliation fallback — if a connection drops or a publish
is missed, the poll still catches up within 30s, so SSE is additive,
not a replacement the rest of the system depends on for correctness.

`EventSource` can't send custom request headers, and this app's whole
auth model is a bearer token (no cookies) — so the stream endpoint is
the one place a token travels as a `?token=` query param instead of the
`Authorization` header, verified by a dedicated `requireAuthFromQuery`
alongside the header-based `requireAuth`.

A notification failure should not normally roll back a successful
application stage transition. Keep the notification system simple —
in-app plus a basic email abstraction is sufficient.

## Interviews

Core functionality: schedule, reschedule, cancel, complete, scorecard.

```
Application → Interview → Scorecard
```

See [data-model.md](data-model.md) for the Interview/Scorecard shape.

## Implementation Notes (Phases 8–12)

**BullMQ**, not a hand-rolled queue on raw Redis. Retry/backoff/
dead-letter semantics are easy to get subtly wrong, and this is
precisely the reliability concern this document calls out — a
well-tested queue library gets that correctness for free. It requires
`ioredis` as a direct dependency; the general "prefer `Bun.redis`"
guidance elsewhere in this project is about simple direct key-value
operations, not a queue library with its own driver requirement.

**`resume.parse`** is enqueued from the upload endpoint itself (Phase
5/8). **`application.rank`** is enqueued from `ApplicationService`
after an application commits (Phase 10). **`notification.send`**
carries the notification's actual content (`{userId, type, title,
message}`), not a reference to an already-persisted row — unlike the
other two jobs, the `Notification` row doesn't exist until the worker
creates it, since a notification is pure side effect of an event that
already committed on its own (Phase 12).

**Email** is a real `EmailSender` interface with one implementation,
`ConsoleEmailSender`, which logs instead of sending — no SMTP/email
provider is configured for this project. Swapping in a real provider
means implementing that interface; no caller changes.

**Notification idempotency.** Unlike `resume.parse`/`application.rank`,
which check already-persisted state (`Resume.status`,
`Application.rankedAt`) to no-op on redelivery, `notification.send`
originally had no redelivery guard at all — the `Notification` row
doesn't exist until the worker creates it, so there was nothing to
check against, and a redelivered job (worker crash between processing
and ack, a stalled-job requeue) would create a duplicate row and send
the email twice. Fixed by using the BullMQ job's `id` — stable across
every retry of that job — as an idempotency key: `Notification` now
has a unique `sourceJobId` column, the worker upserts on it instead of
inserting, and a `processedAt` flag tracks whether that job's side
effects (the email) already ran, so a redelivery is a no-op.

## LiveKit (Optional)

LiveKit is optional and not part of the core architecture. Implement it
only after applications, pipeline, resume processing, interviews,
scorecards, notifications, and analytics are all working:

```
Backend → Interview Room Service → LiveKit
```

The assignment does not require building video infrastructure itself. If
LiveKit threatens the timeline, document it as a future enhancement
instead of implementing it.
