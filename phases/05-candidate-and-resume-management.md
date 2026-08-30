# Phase 5 — Candidate and Resume Management

[← Back to index](README.md)

## Goal

Implement candidate profiles and resume uploads. See
[architecture/resume-processing.md](../architecture/resume-processing.md).

### Tasks

- [ ] Create candidate profile.
- [ ] Update candidate profile.
- [ ] Get candidate profile.
- [ ] Configure object storage.
- [ ] Upload resume.
- [ ] Store resume metadata.
- [ ] Store resume file in object storage.
- [ ] Add resume processing status.
- [ ] Add resume hash where useful.
- [ ] Add deterministic duplicate resume checks.
- [ ] Add resume API tests.
- [ ] Verify upload failure handling.

### Verification

- Candidate can manage profile.
- Resume file is stored outside PostgreSQL.
- Resume metadata is stored in PostgreSQL.
- Processing status is clear.
- Failed uploads do not leave inconsistent records where possible.
