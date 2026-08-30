# Phase 9 — Resume Parser Worker

[← Back to index](README.md)

## Goal

Parse resumes asynchronously. See
[architecture/resume-processing.md](../architecture/resume-processing.md).

### Tasks

- [x] Create ResumeParserWorker. (`workers/resumeParse.worker.ts` —
      replaces the Phase 8 mechanical placeholder with the real
      pipeline, same status-lifecycle contract)
- [x] Retrieve resume from object storage. (`ResumeStorage.download()`,
      added this phase — reads the file straight back out of MinIO)
- [x] Extract text from supported resume formats.
      (`candidates/resumeTextExtraction.ts` — PDF via `pdf-parse`,
      DOCX via `mammoth`; legacy `.doc` explicitly unsupported, see
      Architecture Note)
- [x] Define structured candidate extraction output.
      (`ParsedResumeData` in `resumeInformationExtractor.ts` —
      fullName, email, phone, summary, skills, yearsOfExperience,
      education, workExperience)
- [x] Add OpenRouter SDK integration where LLM extraction is useful.
      (`shared/llm/openRouterClient.ts` — the official `openai` SDK
      pointed at OpenRouter's OpenAI-compatible endpoint; see
      Architecture Note on why there's no separate "OpenRouter SDK"
      package)
- [x] Configure a cost-effective default model. (`openai/gpt-4o-mini`
      default)
- [x] Make the model configurable. (`OPENROUTER_MODEL` env var)
- [x] Parse candidate information. (`ResumeInformationExtractor.extract()`
      — real JSON-mode call, defensively validated field-by-field, never
      trusts the model's output shape blindly)
- [x] Update candidate profile. (backfills `Candidate.phone` from the
      parsed resume, but only when the candidate hasn't already set one
      — see Architecture Note)
- [x] Update resume processing status. (`UPLOADED → PROCESSING →
      PARSED`/`FAILED`, same lifecycle Phase 8 established)
- [x] Handle parsing failures. (unsupported formats fail immediately as
      `UnrecoverableError` — no point retrying a format that will never
      parse; genuine extraction errors retry through the normal
      BullMQ backoff from Phase 8)
- [x] Handle LLM failures. (no configured key → skip LLM, resume still
      ends up `PARSED` with `structured: null`; a configured key that
      then fails → retries, then `FAILED` with `parseError` set — see
      Architecture Note on this tradeoff)
- [x] Implement retry behavior. (inherited from Phase 8's
      `createWorker`; extended it this phase to recognize
      `UnrecoverableError` as immediately final rather than only
      checking `attemptsMade` — see Architecture Note, this was a real
      bug caught before it shipped)
- [x] Make processing idempotent. (same property as Phase 8: skips if
      already `PARSED`, re-runs safely if caught mid-`PROCESSING`)
- [x] Add worker tests where practical.
      (`resumeParse.worker.test.ts` — fakes for storage/repositories/
      extractor, no live DB/network needed; `resumeTextExtraction.test.ts`
      — real PDF and DOCX fixtures, not mocked;
      `resumeInformationExtractor.test.ts` — fake OpenAI client,
      validates defensive JSON parsing)
- [x] Verify upload → queue → parse → database flow. (verified live,
      twice: once through the deterministic-only path with a real PDF,
      once through the `FAILED` path with a legacy `.doc` — see
      Verification)

### Architecture Note

**No OpenRouter API key available in this environment.** I don't have
one and can't generate one myself (unlike Postgres/Redis/MinIO, which
I set up locally) — I asked, and was told to proceed without one. The
integration code is real and correct (verified structurally and via
mocked-client tests), but the actual network call to OpenRouter is
**not** live-verified. Everything up to and around that call — text
extraction, defensive JSON validation, status lifecycle, idempotency,
retry/failure handling, phone backfill — is verified for real. Add
`OPENROUTER_API_KEY` to `apps/backend/.env` to exercise the live call.

**`openai` SDK, not a dedicated "OpenRouter SDK".** OpenRouter's API is
OpenAI-compatible; their own docs point developers at the standard
`openai` package with `baseURL` overridden. The only OpenRouter-branded
package on npm (`@openrouter/ai-sdk-provider`) is a provider plugin for
Vercel's `ai` SDK — a much larger dependency tree for the same single
JSON-completion call this needs. `openai` is the correct, minimal
choice here.

**Legacy `.doc` is explicitly unsupported.** `mammoth` only handles
`.docx`; parsing the old binary `.doc` format properly needs a
meaningfully heavier dependency for a format candidates rarely still
use. Uploads are still accepted (Phase 5's validation allows the MIME
type, and the file lands safely in MinIO) — only parsing fails, cleanly
and immediately (`FAILED`, clear `parseError`), not silently.

**No LLM key → still `PARSED`, not `FAILED`.** Text extraction
succeeding is real, useful value (searchable `rawText`; Phase 10's
ranking can fall back to deterministic matching per `ranking.md`) even
without the LLM enrichment layer on top. Treating "no OpenRouter key
configured" as a hard failure would be misleading — it's an expected,
normal state in this environment, not a broken one.

**Once an LLM call is attempted, though, its failure fails the whole
job.** This is a deliberate simplification: keeping `rawText` around
after a *failed* LLM attempt (so retries could re-attempt just the LLM
step, not re-extract text) would mean persisting intermediate state
between BullMQ attempts, which is meaningfully more complexity for a
lightweight assignment. Re-extracting text on retry is cheap and
harmless, so the processor just does the whole thing again from
scratch. Documented as a deliberate tradeoff, not an oversight.

**Bug caught before it shipped: `UnrecoverableError` wasn't being
detected as final.** `createWorker`'s "is this the last attempt"
check (`job.attemptsMade >= job.opts.attempts`) is correct for normal
retry exhaustion, but a job that throws `UnrecoverableError` stops
after attempt 1 regardless of the configured `attempts` — so `1 >= 5`
was false, and `onFinalFailure` would never have fired for an
unsupported-format upload; the `Resume` would have stayed `PROCESSING`
forever. Fixed by also checking `error instanceof UnrecoverableError`.
Caught by writing the real-Redis test for it and watching it fail
before the fix — not by inspection alone.

### Verification

- [x] Resume upload does not wait for parsing (same as Phase 8 — the
      HTTP response returns as soon as the DB/storage writes finish).
- [x] Worker processes resume asynchronously (verified live, separate
      process).
- [x] Candidate profile can be updated from parsed data (phone
      backfill — unit-tested; not live-verified since it depends on
      the LLM step, see Architecture Note above).
- [x] Resume status becomes PARSED or FAILED (verified live both ways:
      a real PDF → `PARSED` with real extracted text; a legacy `.doc`
      → `FAILED` with a clear `parseError`, immediately, no wasted
      retries).
- [x] LLM failure does not destroy the original resume (the file and
      `Resume` row are untouched by a parse failure — only `status`/
      `parseError` change).
- [x] Retry does not corrupt candidate data (idempotency tested: a
      redelivered job for an already-`PARSED` resume is a no-op).
- [x] OpenRouter model is configurable (`OPENROUTER_MODEL`, defaults to
      `openai/gpt-4o-mini`).
