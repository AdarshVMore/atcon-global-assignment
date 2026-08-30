# Phase 7 — Application Pipeline State Machine

[← Back to index](README.md)

## Goal

Implement configurable hiring-stage transitions. See
[architecture/state-machine.md](../architecture/state-machine.md).

### Tasks

- [x] Define application states/transitions. (generic rule in
      `applications/pipeline.ts` — see Architecture Note; not hardcoded
      to specific stage names, since stages are configurable per job)
- [x] Implement state transition logic.
      (`assertValidStageTransition(currentStage, targetStage)`)
- [x] Validate current stage. (rejects any move once the current stage
      is terminal)
- [x] Validate target stage. (must belong to the same job; must be
      either the immediate next stage by `order` or any terminal stage)
- [x] Prevent invalid transitions. (skip-ahead, regression, same-stage,
      and out-of-terminal all rejected with specific messages)
- [x] Move application between stages. (`PATCH
      /applications/:applicationId/stage`, recruiter-owner only)
- [x] Create ApplicationStageHistory record. (every successful move,
      same transaction as the `Application` update)
- [x] Record actor. (`changedById` — the recruiter's user id)
- [x] Record timestamp. (`changedAt`, DB default)
- [x] Record optional reason. (`reason` field on the request body)
- [x] Add audit logging where appropriate. (`AuditLog` row —
      `APPLICATION_STAGE_CHANGED` — written in the same transaction;
      see Architecture Note)
- [x] Add valid-transition tests. (`pipeline.test.ts`,
      `application.service.test.ts`)
- [x] Add invalid-transition tests. (skip-ahead, regression, same-stage,
      terminal-lock — all covered)
- [x] Verify transaction consistency. (`Application` update +
      `ApplicationStageHistory` + `AuditLog` in one
      `prisma.$transaction`; verified live that all three land together)
- [x] Verify authorization. (candidate blocked with 403; non-owning
      recruiter blocked with 403 — verified live and in tests)

### Architecture Note

**Generic transition rule, not per-stage-name logic.** Since stages are
configurable per job (Phase 4), the rule can't hardcode "Screening" or
"Hired." From a non-terminal stage: advance to the immediate next stage
by `order`, or jump straight to *any* terminal stage. Nothing moves out
of a terminal stage, and there's no regressing to an earlier stage. This
covers rejection from any point in the pipeline (explicitly called out
in `state-machine.md`) and also allows fast-tracking straight to a
success terminal stage (e.g. an internal referral skipping straight to
`Hired`) — a job could have several terminal stages, and nothing here
tries to guess which one means "success" versus "rejection." Documented
as a deliberate simplification; a future phase could add a
`SUCCESS`/`REJECTED` flag on `JobStage` if that distinction needs to be
enforced more strictly.

**`AuditLog` used here, not built as an unused table.** Schema
(Phase 1) has both `ApplicationStageHistory` (domain-specific: from,
to, who, when, why) and a generic `AuditLog` (who, what, when, resource,
previous/new state) intended for cross-cutting traceability across
multiple kinds of actions. Both get written in the same transaction as
the stage move — `ApplicationStageHistory` is the primary record used
in listings/UI; `AuditLog` proves out the general mechanism on the one
action the architecture doc calls out by name ("at minimum, stage
transitions must be traceable"). Other action types can start writing
to it as they come up, without needing a redesign.

**`GET /applications/:applicationId/history`** was added alongside the
stage-move endpoint — it's in `api-design.md`'s example routes and is a
one-line addition given `stageHistory` was already loaded on every
application fetch.

### Verification

- [x] Valid transitions work (Applied → Screening, verified live with
      history and audit log entries confirmed in Postgres).
- [x] Invalid transitions fail (skip-ahead → 400, verified live; see
      tests for regression/same-stage/terminal-lock).
- [x] Stage history is always recorded for successful transitions (same
      transaction, cannot happen independently).
- [x] Actor and timestamp are captured (`changedById`, `changedAt` —
      confirmed live).
- [x] Failed transitions do not partially update state (invalid moves
      throw before the transaction starts; a mid-transaction failure
      would roll back everything since all three writes share one
      `prisma.$transaction`).
