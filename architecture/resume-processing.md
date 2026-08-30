# Resume Processing & Duplicate Detection

Resume files are stored in object storage; resume metadata is stored in
PostgreSQL. See [background-jobs.md](background-jobs.md) for queue/worker
reliability principles that apply here.

## Flow

```
Candidate
    │
    ▼
Upload Resume
    │
    ▼
Backend
    │
    ├── create Resume record
    │
    ├── store file
    │
    └── enqueue parse job
              │
              ▼
           Redis
              │
              ▼
       Resume Parser Worker
              │
              ├── extract text
              │
              ├── optional LLM parsing
              │
              ▼
         PostgreSQL
```

## Processing States

```
UPLOADED
PROCESSING
PARSED
FAILED
```

Exact names can be adjusted during implementation but must remain
understandable.

## Parsing and OpenRouter

Use the OpenRouter SDK when an LLM is useful for extracting structured
candidate information:

```
Resume → Text Extraction → LLM → Structured Candidate Information → PostgreSQL
```

Use a cheaper model by default when quality is sufficient. The model must
be configurable through environment variables. The application must not
depend entirely on LLM success — if parsing fails, the Resume is marked
`FAILED` but the uploaded file still exists.

## Duplicate Candidate Detection

Use a layered approach:

**Level 1 — Deterministic.** Normalize email and phone. Use database
constraints where appropriate.

**Level 2 — File Hash.** Calculate a resume hash (e.g. SHA-256) to
identify the same uploaded file.

**Level 3 — Optional Similarity.** If time allows, add fuzzy/similarity
matching using name, email, phone, and extracted profile information.

Do not build an unnecessarily complicated ML system — the first version
should be deterministic, reliable, and easy to explain.

**Implementation status:** Level 1 (`User.email`, `Candidate.phone`
unique constraints) and Level 2 (`(candidateId, fileHash)` unique
constraint on `Resume`, checked before any storage write) are both
implemented. Level 3 was not built — it's explicitly optional above,
and cross-candidate hash matching (two different accounts uploading
the identical file) also isn't surfaced anywhere yet. See
[phases/05-candidate-and-resume-management.md](../phases/05-candidate-and-resume-management.md)
and
[phases/14-reliability-testing-and-cleanup.md](../phases/14-reliability-testing-and-cleanup.md).

Legacy `.doc` files are accepted at upload (the MIME type is allowed)
but not parsed — only `.pdf` and `.docx` have real text extraction.
Parsing a `.doc` fails immediately and cleanly (`FAILED`, a specific
`parseError`); the upload itself still succeeds.
