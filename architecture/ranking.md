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
