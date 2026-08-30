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
      ┌───┴────┐
      ▼        ▼
   In-App    Email
```

A notification failure should not normally roll back a successful
application stage transition. Keep the notification system simple —
in-app plus a basic email abstraction is sufficient.

## Interviews

Core functionality: schedule, reschedule, cancel, complete, scorecard.

```
Application → Interview → Scorecard
```

See [data-model.md](data-model.md) for the Interview/Scorecard shape.

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
