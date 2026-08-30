# Phase 7 — Application Pipeline State Machine

[← Back to index](README.md)

## Goal

Implement configurable hiring-stage transitions. See
[architecture/state-machine.md](../architecture/state-machine.md).

### Tasks

- [ ] Define application states/transitions.
- [ ] Implement state transition logic.
- [ ] Validate current stage.
- [ ] Validate target stage.
- [ ] Prevent invalid transitions.
- [ ] Move application between stages.
- [ ] Create ApplicationStageHistory record.
- [ ] Record actor.
- [ ] Record timestamp.
- [ ] Record optional reason.
- [ ] Add audit logging where appropriate.
- [ ] Add valid-transition tests.
- [ ] Add invalid-transition tests.
- [ ] Verify transaction consistency.
- [ ] Verify authorization.

### Verification

- Valid transitions work.
- Invalid transitions fail.
- Stage history is always recorded for successful transitions.
- Actor and timestamp are captured.
- Failed transitions do not partially update state.
