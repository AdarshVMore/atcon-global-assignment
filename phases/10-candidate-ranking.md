# Phase 10 — Candidate Ranking

[← Back to index](README.md)

## Goal

Add asynchronous candidate/job matching. See
[architecture/ranking.md](../architecture/ranking.md).

### Tasks

- [x] Define ranking input. (job title/description/requirements text +
      candidate's resume `parsedData` — skills if structured, raw
      extracted text otherwise)
- [x] Define ranking output. (`{score, matchedKeywords,
      totalJobKeywords}` from the deterministic pass, optionally
      `{score, reasoning}` from the LLM pass — both stored)
- [x] Create RankingWorker. (`workers/applicationRank.worker.ts`)
- [x] Trigger ranking after application creation.
      (`ApplicationService.applyToJob` enqueues after the `Application`
      row commits — same non-blocking pattern as Phase 8's resume
      enqueue)
- [x] Implement simple candidate/job matching. (keyword overlap between
      job text and candidate skills/resume text)
- [x] Use deterministic signals where practical.
      (`ranking/deterministicScore.ts` — always computed, LLM available
      or not)
- [x] Use OpenRouter only where semantic matching benefits from an LLM.
      (`CandidateJobMatcher` only runs when `OPENROUTER_API_KEY` is
      configured; the deterministic score is the baseline either way —
      see Architecture Note)
- [x] Configure a cheaper model by default. (reuses `OPENROUTER_MODEL`
      from Phase 9 — `openai/gpt-4o-mini` by default; see Architecture
      Note on why this isn't a second model setting)
- [x] Persist ranking result. (`Application.rankingScore`,
      `rankingExplanation`, `rankedAt`)
- [x] Handle ranking failure. (an LLM failure throws and retries
      through the normal queue backoff; `rankingScore` stays `null`
      until it actually succeeds — never a partial/corrupt write)
- [x] Make ranking retry-safe. (idempotent: skips if
      `application.rankedAt` is already set)
- [x] Add ranking tests. (`deterministicScore.test.ts`,
      `candidateJobMatcher.test.ts` — fake OpenAI client,
      `applicationRank.worker.test.ts` — fakes for every repository,
      no live DB/network needed)
- [x] Verify end-to-end asynchronous ranking. (verified live twice —
      see Verification)

### Architecture Note

**Same OpenRouter-key gap as Phase 9.** No key available in this
environment; the LLM matching path (`CandidateJobMatcher`) is real code,
unit-tested with a fake client, but not live-verified against the real
API. The deterministic path — the one the architecture doc says should
be sufficient on its own — is fully live-verified (see below).

**One `OPENROUTER_MODEL`, not a separate ranking model.** The
architecture doc's "configure a cheaper model by default" is already
satisfied by Phase 9's default (`openai/gpt-4o-mini`) and its one env
var. Introducing `OPENROUTER_RANKING_MODEL` alongside it would be a
second knob for the same underlying concern (cost-conscious model
choice) with no stated need for the two features to ever use different
models.

**Deterministic score is always computed.** `computeDeterministicScore`
runs unconditionally, LLM/embeddings available or not — the baseline
the architecture doc calls "sufficient."

**Revised: deterministic + embedding blend, LLM for rationale only.**
The original design let the LLM's chat-completion score fully replace
the deterministic one whenever an API key was configured. Revisited
(see [architecture/ranking.md](../architecture/ranking.md) for the
full reasoning) to match how real ATSs typically score matches:
embedding similarity (job text vs. resume text, via OpenRouter's
`/embeddings` endpoint) is now blended with the deterministic score
(`0.4 * deterministic + 0.6 * embeddingSimilarity`), and the LLM chat
call supplies only `explanation.llmReasoning`, a human-readable
rationale — its score is no longer used for anything. Both
`Job.embedding` and `Resume.embedding` are cached (`Float[]` columns)
rather than recomputed on every ranking; `Resume.embedding` is
permanently valid once set (resumes are immutable), `Job.embedding` is
cleared back to `[]` by `JobRepository.update()` whenever
title/description/requirements change.

**The race condition is now actually handled, not just noted as
unlikely.** The two async pipelines (`resume.parse`, `application.rank`)
are genuinely independent queues with no ordering guarantee — ranking
could run before parsing finished, scoring against an empty candidate
signal. The worker now checks `Resume.status` before scoring: not yet
`PARSED`/`FAILED` throws to let BullMQ's retry/backoff wait for parsing,
instead of persisting a false near-zero score. `FAILED` is a legitimate
terminal state and ranks with whatever's available.

**An LLM rationale failure degrades gracefully instead of failing the
whole job.** Different from Phase 9's structured-extraction call, where
a failure means there's genuinely no data to store — here the LLM only
supplies flavor text on top of an otherwise-complete deterministic+
embedding score, so a failed rationale call is caught, logged, and
stored as `llmReasoning: null` rather than losing a good score to a
retry loop over commentary.

### Verification

- [x] Application is created even if ranking fails (enqueue is wrapped
      in try/catch, same as Phase 8's resume enqueue — a queue outage
      doesn't touch the already-committed `Application`).
- [x] Ranking happens asynchronously (verified live: `POST
      .../applications` returns immediately with `rankingScore: null`;
      the worker fills it in afterward, in Postgres, without the
      request waiting on it).
- [x] Ranking result is stored (`rankingScore`, `rankingExplanation`,
      `rankedAt` all confirmed via `psql`).
- [x] Worker retry does not corrupt application state (idempotency
      test: a redelivered job for an already-ranked application is a
      no-op; ranking only ever touches ranking-specific columns).
- [x] LLM model is configurable (`OPENROUTER_MODEL`).
- [x] LLM is not unnecessarily used for deterministic operations (the
      deterministic pass runs regardless of `OPENROUTER_API_KEY`, and
      is what live verification exercised end to end — verified twice:
      once against a stale test resume with no overlap, correctly
      scoring 0, and once against a freshly parsed resume with real
      keyword overlap, correctly scoring 25 with `matchedKeywords:
      ["docx", "resume"]`).
