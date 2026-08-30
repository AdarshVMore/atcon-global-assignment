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
"sufficient." When `OPENROUTER_API_KEY` is configured, the LLM's score
becomes the stored `Application.rankingScore` (a semantic read
generally beats naive keyword overlap), but the deterministic result
stays alongside it in `rankingExplanation` either way. No OpenRouter
key was available while building this — see
[phases/10-candidate-ranking.md](../phases/10-candidate-ranking.md) for
what was and wasn't live-verified.
