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

## Implementation Note (Phase 7)

The transition rule implemented is deliberately generic rather than
tied to specific stage names, since stages are configurable per job:
from a non-terminal stage, an application can advance to the immediate
next stage by `order`, or jump straight to *any* terminal stage
(covers rejection — or a fast-tracked hire — from anywhere in the
pipeline). Nothing moves once a terminal stage is reached, and there's
no regressing to an earlier stage.

`JobStage.isTerminal` intentionally does not distinguish a "success"
terminal stage (e.g. Hired) from a "failure" one (e.g. Rejected) — a
job could have several terminal stages, and the schema doesn't try to
guess which one means what. One consequence: derived metrics that need
to know "was this a hire" (see [dashboard.md](dashboard.md)'s
time-to-hire) currently do so by matching on the stage name "Hired",
not a structural flag. See
[phases/07-application-pipeline-state-machine.md](../phases/07-application-pipeline-state-machine.md)
for the full reasoning.
