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

**Deterministic score is always computed; the LLM only replaces it,
never substitutes for it being computed.** `computeDeterministicScore`
runs unconditionally. If `OPENROUTER_API_KEY` is set, the LLM's score
becomes `Application.rankingScore` (a semantic read is generally better
than naive keyword overlap when available) — but the deterministic
result is still stored alongside it in `rankingExplanation`, so the
signal isn't lost. If ranking a resume that hasn't been parsed yet
(the two async pipelines are independent, so a race is possible in
principle, though unlikely — candidates usually upload well before
applying), it degrades to an empty candidate signal → a low/zero score,
not a crash.

**Once an LLM call is attempted, its failure fails the whole job** —
same simplification as Phase 9, for the same reason: retrying the
cheap deterministic computation alongside the LLM call is harmless, and
preserving partial state between BullMQ attempts is more complexity
than this warrants.

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
