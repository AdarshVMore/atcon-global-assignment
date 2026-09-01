# Candidate Ranking

Ranking is derived data — it must not determine whether an Application
exists. See [background-jobs.md](background-jobs.md) for the underlying
queue/reliability model.

## Flow

```
Candidate
    │
    ▼
Apply to Job
    │
    ▼
Create Application
    │
    ├───────────────► PostgreSQL
    │
    ▼
Ranking Job
    │
    ▼
Redis
    │
    ▼
Ranking Worker
    │
    ▼
Candidate ↔ Job Match
    │
    ▼
PostgreSQL
```

If an LLM is useful for semantic matching:

```
Ranking Worker → OpenRouter → Cheap capable model → Structured score/result
```

Do not use an LLM where deterministic ranking is sufficient. The ranking
strategy should remain simple enough to explain, and creating an
Application must never depend on ranking succeeding.

**Implementation note (Phase 10):** the deterministic keyword-overlap
score (`ranking/deterministicScore.ts`) is always computed, LLM
available or not — it's the baseline the architecture calls
"sufficient." No OpenRouter key was available while building this —
see [phases/10-candidate-ranking.md](../phases/10-candidate-ranking.md)
for what was and wasn't live-verified.

**Race condition fix:** `resume.parse` and `application.rank` are
independent queues with no ordering guarantee, so ranking could
originally run before a resume finished parsing — scoring against an
empty candidate signal. The ranking worker now checks the resume's
`status` before scoring: if it's not yet `PARSED` or `FAILED`, it
throws so BullMQ's existing retry/backoff handles waiting for parsing
to finish, rather than persisting a false near-zero score. A `FAILED`
resume is a legitimate terminal state, not a race, so ranking proceeds
with whatever signal is available.

**Scoring revision — deterministic + embedding blend, not "LLM wins":**
the original design let an LLM chat-completion score fully replace the
deterministic one whenever an API key was configured. That makes the
score's meaning depend on whether a key happens to be set, and a
single chat call is comparatively expensive, slow, and non-reproducible
for what should be a stable ranking number. This was revised to match
common ATS practice more closely:

- **Deterministic keyword overlap** (`deterministicScore.ts`) — always
  computed, unchanged.
- **Embedding similarity** (`ranking/embeddingClient.ts` +
  `ranking/cosineSimilarity.ts`) — cosine similarity between the job's
  text embedding and the resume's text embedding, computed via
  OpenRouter's `/embeddings` endpoint (same OpenAI SDK client already
  used for chat, pointed at the same base URL) when
  `OPENROUTER_API_KEY` is configured. Cheaper and more reproducible
  than a chat call, and a stronger semantic signal than raw keyword
  overlap.
- **Final score** is a weighted blend — `0.4 * deterministic + 0.6 *
  embeddingSimilarity` — when embeddings are available, falling back to
  the deterministic score alone otherwise. Two signals only (not the
  four-signal skills/experience/embedding/recency blend real ATSs
  sometimes use), because this data model doesn't reliably parse
  years-of-experience or role-recency out of a resume yet — inventing
  weighted sub-scores for fields that aren't actually extracted would
  be fake precision. Extending the resume parser to capture those is a
  separate, scoped change if wanted later.
- **The LLM chat call (`CandidateJobMatcher`) now supplies only a
  human-readable rationale**, stored as `explanation.llmReasoning` —
  its numeric score is no longer used. If the rationale call fails, it
  degrades gracefully (logged, `llmReasoning: null`) rather than
  failing the whole ranking job, since a missing rationale isn't worth
  losing an otherwise-complete score over.

**Embeddings are cached, not recomputed per ranking.** `Job.embedding`
and `Resume.embedding` (`Float[]` columns) are computed once and
reused. A resume never changes after upload (a re-upload is a new
`Resume` row), so its embedding is permanently valid once set. A job's
title/description/requirements can be edited after publishing, so
`JobRepository.update()` clears `embedding` back to `[]` whenever any
of those fields change, forcing the next ranking to recompute it
against the current text.
