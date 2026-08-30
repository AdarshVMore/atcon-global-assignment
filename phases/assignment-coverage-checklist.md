# Assignment Coverage Checklist

[← Back to index](README.md)

Every item should be verified before submission. This is a cross-cutting
checklist, not tied to a single phase — use it alongside
[16-final-assignment-preparation.md](16-final-assignment-preparation.md).

- [x] Publish job openings — `POST /jobs` + `POST /jobs/:jobId/publish` (Phase 4)
- [x] Receive applications — `POST /jobs/:jobId/applications` (Phase 6)
- [x] Candidate profiles — `GET/PATCH /candidates/me` (Phase 5)
- [x] Resume upload — `POST /candidates/me/resumes`, stored in MinIO (Phase 5)
- [x] Resume parsing — PDF/DOCX text extraction + OpenRouter structured extraction, async (Phase 9)
- [x] Configurable hiring stages — per-job `JobStage[]`, custom or default pipeline (Phase 4)
- [x] Candidate stage transitions — generic next-or-terminal rule, validated (Phase 7)
- [x] Interview scheduling — schedule/reschedule/cancel/complete (Phase 11)
- [x] Structured scorecards — fixed fields, validated ranges, one per interview (Phase 11)
- [x] Time-to-hire — `GET /dashboard/overview`, verified live with a real Applied→Hired transition (Phase 13)
- [x] Pipeline health — active/terminal/stale application counts (Phase 13)
- [x] Recruiter authentication — `POST /auth/register` + `/login` (Phase 3)
- [x] Recruiter authorization — ownership-checked on every job/application/interview mutation (Phase 3, 4, 6, 7, 11)
- [x] Candidate authorization — self-resource access only, verified live (Phase 3, 5, 6)
- [x] Duplicate candidate detection — unique email/phone (Level 1), unique resume hash per candidate (Level 2); cross-candidate and fuzzy matching (Level 3) not built — see README's Known Limitations (Phase 1, 3, 5, 14)
- [x] Background jobs — BullMQ + Redis, 3 queues, retry/backoff/idempotency verified against real Redis (Phase 8)
- [x] Notifications — in-app (real `Notification` rows) + email abstraction (`ConsoleEmailSender`, no provider configured) (Phase 12)
- [x] Stage-change audit trail — `ApplicationStageHistory` (every transition) + `AuditLog` (Phase 7)
- [x] Database design — PostgreSQL via Prisma, constraints backing every duplicate/ownership rule (Phase 1, 14)
- [x] Backend API — REST, resource-oriented, full route table in root README (all phases)
- [x] Dashboard backend — `GET /dashboard/overview`, `GET /jobs/:jobId/pipeline` (Phase 13)
- [x] Reliability handling — graceful degradation for Redis/MinIO/OpenRouter outages, worker idempotency, retry with backoff, reviewed end-to-end in Phase 14
- [x] Documentation — root README (setup, API, tradeoffs, limitations, future work), architecture docs with implementation notes, phase-by-phase decision log
- [x] Setup instructions — root README's Local Setup / Running sections, verified against the actual local environment
- [ ] Demo / walkthrough — source code and setup instructions are ready; a recorded demo video is the user's to produce, not something this session can create

Verified together in one live end-to-end pass on 2026-08-30: register
recruiter, register candidate, duplicate registration rejected, publish
a job, upload a resume (parsed), duplicate resume rejected, apply,
move stage (audit trail confirmed via history), schedule + complete an
interview, submit a scorecard, in-app notifications on both sides,
dashboard pipeline health, candidate blocked from recruiter actions.
