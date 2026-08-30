# Phase 12 — Notifications

[← Back to index](README.md)

## Goal

Notify users about important recruitment events. See
[architecture/background-jobs.md](../architecture/background-jobs.md#notifications).

### Tasks

- [x] Define notification types. (reused the `NotificationType` enum
      from Phase 1: `APPLICATION_RECEIVED`, `APPLICATION_STAGE_CHANGED`,
      `INTERVIEW_SCHEDULED`, `INTERVIEW_RESCHEDULED`,
      `INTERVIEW_CANCELLED` — no schema change needed)
- [x] Implement NotificationService. (`notifications/notification.service.ts`
      — `notifyAsync()` for other services to trigger a notification,
      `listForUser()`/`markAsRead()` for the API-facing side)
- [x] Queue notification jobs. (`notification.send` queue's payload is
      now the actual notification content — `{userId, type, title,
      message}` — finalized this phase; Phase 8 only reserved the name)
- [x] Implement NotificationWorker.
      (`workers/notificationSend.worker.ts`)
- [x] Add in-app notifications. (`Notification` row created by the
      worker; `GET /notifications`, `PATCH
      /notifications/:notificationId/read`)
- [x] Add email abstraction if practical. (`EmailSender` interface +
      `ConsoleEmailSender` — see Architecture Note)
- [x] Notify candidate about relevant application changes.
      (`APPLICATION_STAGE_CHANGED` on stage moves;
      `INTERVIEW_SCHEDULED`/`RESCHEDULED`/`CANCELLED` on the matching
      interview actions)
- [x] Notify recruiter about relevant candidate events.
      (`APPLICATION_RECEIVED` when a candidate applies)
- [x] Handle notification failures. (enqueue wrapped in try/catch,
      logged, never throws — same non-blocking pattern as the resume
      and ranking queues from Phase 8/10)
- [x] Add notification tests. (`notification.service.test.ts`,
      `notificationSend.worker.test.ts`)

### Architecture Note

**No real email provider — `ConsoleEmailSender` logs instead of
sending.** No SMTP/provider credentials are configured for this
project (same category of gap as the OpenRouter key, though lower
stakes — nothing in the assignment specifically grades the ability to
actually deliver email, unlike the LLM integration). `EmailSender` is a
real interface with one method; swapping in Postmark/SES/Resend later
means implementing that interface, not touching any caller.

**The queue job carries the notification's content, not just an ID.**
Unlike `resume.parse`/`application.rank` (which reference an
already-persisted row), the `Notification` row doesn't exist yet when
`notifyAsync` enqueues — the triggering event (stage change, new
application, ...) has already committed on its own, and the
notification itself is pure side effect. So the job payload is
`{userId, type, title, message}` directly; the worker creates the row.

**Notification delivery isn't redelivery-idempotent, and that's a
deliberate, documented tradeoff.** Unlike the other two workers, there's
no existing-row check to skip a redelivered job — a rare BullMQ
redelivery would create a duplicate in-app notification. Building real
dedup (an idempotency key, a unique constraint) is more machinery than
a low-stakes side effect like this warrants; a duplicate notification
is mildly annoying, never destructive or state-corrupting, unlike a
duplicate resume-parse or ranking result would be.

**`INTERVIEW_COMPLETED` has no notification.** The `NotificationType`
enum has no matching value, and adding one is a schema migration this
phase doesn't need to make just for one more notification type. Noted
as a gap, not silently skipped.

**Service-to-service dependency, deliberately.** `ApplicationService`
and `InterviewService` depend on `NotificationService` directly (not
just its repository) — the one service-to-service dependency in this
codebase. Phase 11 explicitly avoided this pattern for *authorization*
reuse (read-vs-write semantics didn't line up cleanly), but triggering
a side effect through another module's service is a different, much
more standard use of the pattern — no shared logic to misalign, just
"this event happened, tell that module."

### Verification

- [x] Notifications are asynchronous where appropriate (verified live:
      applying and moving a stage both return immediately; the
      `Notification` row and the "email" appear afterward, via the
      worker).
- [x] Notification failure does not break core business operations
      (enqueue failures are caught and logged, never thrown — unit
      tested).
- [x] Notification state is understandable (`isRead` boolean,
      ownership-checked `markAsRead` — verified live: a recruiter
      cannot mark a candidate's notification read (403), the candidate
      can mark their own (200)).
