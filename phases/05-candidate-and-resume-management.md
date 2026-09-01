# Phase 5 — Candidate and Resume Management

[← Back to index](README.md)

## Goal

Implement candidate profiles and resume uploads. See
[architecture/resume-processing.md](../architecture/resume-processing.md).

### Tasks

- [x] Create candidate profile. (created at registration, Phase 3 —
      nothing new needed here)
- [x] Update candidate profile. (`PATCH /candidates/me` — phone only,
      the one self-editable field the schema currently has)
- [x] Get candidate profile. (`GET /candidates/me`)
- [x] Configure object storage. (MinIO via Docker for local dev,
      `Bun.S3Client` in `shared/storage/resumeStorage.ts` — no extra S3
      SDK dependency needed, Bun has one built in)
- [x] Upload resume. (`POST /candidates/me/resumes`,
      `multipart/form-data`, field name `file`)
- [x] Store resume metadata. (`Resume` row: candidate, file key,
      original name, MIME type, hash, status)
- [x] Store resume file in object storage. (uploaded to MinIO under
      `resumes/<candidateId>/<uuid>-<filename>`, verified in the bucket
      directly)
- [x] Add resume processing status. (`Resume.status` defaults to
      `UPLOADED`; parsing itself is Phase 8/9 — no queue exists yet to
      move it further)
- [x] Add resume hash where useful. (SHA-256 via `Bun.CryptoHasher`,
      computed before touching storage)
- [x] Add deterministic duplicate resume checks. (same candidate
      re-uploading an identical file → `409 Conflict`, checked by hash
      before any write to storage — see Architecture Note on scope)
- [x] Add resume API tests. (`resume.service.test.ts`,
      `candidate.service.test.ts`)
- [x] Verify upload failure handling. (rejected before any DB row is
      created if storage validation fails; on a DB-write failure after
      a successful storage write, the orphaned object is deleted —
      tested and verified)

### Architecture Note

**Object storage: MinIO via `Bun.S3Client`.** Bun ships a native
S3-compatible client, so no AWS SDK or other S3 library was needed —
`new Bun.S3Client({ endpoint, accessKeyId, ... })` talks to MinIO
locally and to real S3/R2/Spaces in any other environment by changing
env vars only.

**Upload ordering.** Duplicate-hash check happens before any storage
write (no wasted upload for a rejected duplicate). For a genuinely new
file: storage write happens *before* the DB row is created — if the DB
insert then fails, the uploaded object is deleted (best-effort). This
is the safer order: a dangling object in MinIO is harmless, but a
`Resume` row pointing at a file that was never actually written would
break anything that later tries to read it.

**Duplicate detection scope.** Only same-candidate, same-file-hash
duplicates are rejected right now (Level 2 from
[resume-processing.md](../architecture/resume-processing.md)). Level 1
(email/phone) is already enforced by the `User.email` and
`Candidate.phone` unique constraints from Phase 1/3. Cross-candidate
hash matches (two different accounts uploading the identical file, a
signal worth surfacing to a recruiter) aren't flagged yet — there's no
schema field for it and no recruiter-facing surface to show it on yet.
Level 3 fuzzy matching is explicitly "if time allows" in the
architecture doc and hasn't been started. Noting these as known gaps
rather than silently skipping them.

**`/candidates/me`, not `/candidates/:candidateId`.** `api-design.md`'s
example uses `:candidateId`, but nothing in the system yet hands a
candidate their own `candidateId` to put in a URL (`register`/`login`
only return the `User`). Following the same self-resource pattern as
`GET /me` from Phase 3 avoids inventing an ID-discovery step for no
reason yet. Recruiter read access to a specific candidate's profile
(needed once applications exist) will most likely be scoped through
`GET /applications/:id` in Phase 6 rather than an open
`/candidates/:candidateId`, since recruiters should only see candidates
who applied to their jobs, not browse candidates directly. `api-design.md`
explicitly allows routes to evolve as implementation details firm up.

**Later addition — recruiter resume file access.** This phase
originally left `Resume.fileUrl` as a write-only storage key with no
way for a recruiter to actually view the file (noted as a gap in the
frontend's Phase 6 candidate work). Added afterward: `GET
/applications/:applicationId/candidate/resumes/:resumeId`
(`ResumeService.getFileForRecruiter`), streaming the file bytes through
the backend, scoped through the application relationship the same way
as `GET /applications/:applicationId/candidate`. See
[architecture/resume-processing.md](../architecture/resume-processing.md#recruiter-file-access)
for why bytes are proxied rather than a presigned S3 URL handed back.
Live-verified: uploaded a real PDF as a candidate, applied, fetched it
back byte-for-byte identical as the owning recruiter, and confirmed a
different recruiter gets `404` and a candidate gets `403`.

### Verification

- [x] Candidate can manage profile (get, update phone — verified live).
- [x] Resume file is stored outside PostgreSQL (confirmed present in
      the MinIO bucket via `mc ls`).
- [x] Resume metadata is stored in PostgreSQL (`Resume` row returned
      from the API and confirmed in the database).
- [x] Processing status is clear (`UPLOADED` on every new resume;
      `ResumeStatus` enum already covers `PROCESSING`/`PARSED`/`FAILED`
      for when Phase 9 wires up parsing).
- [x] Failed uploads do not leave inconsistent records where possible
      (verified live: wrong file type rejected before any write;
      re-uploading the identical file rejected by hash before touching
      storage; unit-tested DB-failure-after-storage-success cleanup
      path).
