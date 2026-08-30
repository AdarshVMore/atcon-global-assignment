# Phase 10 — Candidate Ranking

[← Back to index](README.md)

## Goal

Add asynchronous candidate/job matching. See
[architecture/ranking.md](../architecture/ranking.md).

### Tasks

- [ ] Define ranking input.
- [ ] Define ranking output.
- [ ] Create RankingWorker.
- [ ] Trigger ranking after application creation.
- [ ] Implement simple candidate/job matching.
- [ ] Use deterministic signals where practical.
- [ ] Use OpenRouter only where semantic matching benefits from an LLM.
- [ ] Configure a cheaper model by default.
- [ ] Persist ranking result.
- [ ] Handle ranking failure.
- [ ] Make ranking retry-safe.
- [ ] Add ranking tests.
- [ ] Verify end-to-end asynchronous ranking.

### Verification

- Application is created even if ranking fails.
- Ranking happens asynchronously.
- Ranking result is stored.
- Worker retry does not corrupt application state.
- LLM model is configurable.
- LLM is not unnecessarily used for deterministic operations.
