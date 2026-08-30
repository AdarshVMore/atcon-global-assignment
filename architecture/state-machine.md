# Application Pipeline State Machine

See [data-model.md](data-model.md) for the Application entity this governs.

## Lifecycle

The application lifecycle is modeled as a state machine, e.g.:

```
                     ┌──────────────┐
                     │    APPLIED   │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  SCREENING   │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ SHORTLISTED  │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  INTERVIEW   │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    OFFER     │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    HIRED     │
                     └──────────────┘
```

`REJECTED` can be reached from appropriate stages. The exact transition
rules should be implemented as explicit business logic. Do not allow
arbitrary status updates such as `application.status = "anything"`.

## Stage History

Every important stage transition creates an immutable history record:

```
Application
      │
      │ transition
      ▼
ApplicationStageHistory

applicationId
fromStage
toStage
changedBy
changedAt
reason
```

This provides auditability, pipeline history, time-spent-in-stage data,
time-to-hire calculations, and debugging context. Stage history must not
be silently bypassed.

## Audit Trail

Audit important business actions — at minimum, stage transitions must be
traceable. Useful audit information: who, what, when, resource, previous
state, new state. Do not attempt to build a universal enterprise audit
platform — keep it practical.
