# Phase 15 — LiveKit

[← Back to index](README.md)

## Goal

Only if time remains, add realtime interview functionality. See
[architecture/background-jobs.md](../architecture/background-jobs.md#livekit-optional).

### Tasks

- [x] Evaluate whether LiveKit is worth including. (evaluated — see
      Decision below)
- [x] Document why it is being included. (it isn't — deferred; see
      Decision)
- [ ] Define interview room behavior. (deferred)
- [ ] Add LiveKit configuration. (deferred)
- [ ] Generate/access room credentials safely. (deferred)
- [ ] Add backend LiveKit integration. (deferred)
- [ ] Add required room endpoints. (deferred)
- [ ] Verify interview authorization. (deferred)
- [ ] Verify basic room joining flow. (deferred)
- [ ] Document LiveKit setup. (deferred)

### Decision: Deferred

Evaluated and deferred rather than implemented, for reasons specific to
this project's state, not just "it's optional":

1. **Assignment priority ordering** (`CLAUDE.md`) ranks "optional
   enhancements" last, below required functionality, correct business
   behavior, readable architecture, reliability, tests, and
   documentation. All of those are done for every required capability
   (Phases 0–14). LiveKit is the one remaining item that sits purely in
   the lowest-priority bucket.
2. **A token/room-generation endpoint isn't meaningfully verifiable on
   its own.** Every other phase in this project was live-verified
   end-to-end against real infrastructure — real Postgres, real Redis,
   real MinIO, a real (if hand-crafted) PDF/DOCX, real HTTP requests.
   LiveKit's actual value — two participants joining a live video
   room — only shows up through a video-capable client. The frontend is
   explicitly out of scope for this entire engagement
   (`CLAUDE.md`'s Current Scope: "Do not implement the frontend yet").
   Generating an access token and asserting it decodes correctly proves
   far less than everything else built so far was held to.
3. **The interview/scorecard functionality LiveKit would sit on top of
   already fully works without it** (Phase 11) — scheduling, joining
   information (`meetingUrl` already exists as a generic field on
   `Interview` for exactly this purpose — any conferencing link,
   LiveKit-generated or otherwise, fits there today), rescheduling,
   cancellation, completion, and structured scorecards are all built,
   tested, and live-verified. Nothing required depends on this phase.

This matches the phase file's own explicit guidance: "If time becomes
limited, mark this phase deferred and document it." Time isn't the
constraint here so much as return on effort — this would be
infrastructure added for a capability that can't be properly
demonstrated yet, for the lowest-priority item in the assignment,
after everything higher-priority is already complete.

**If revisited later** (once a frontend exists): `Interview.meetingUrl`
is already the integration point — no schema change needed. A LiveKit
integration would add a `POST /interviews/:interviewId/room-token`
endpoint (recruiter-owner or candidate-owner, reusing the exact
ownership checks already built into `InterviewService`), backed by
LiveKit's server SDK for access-token generation, with `LIVEKIT_URL`/
`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` added to config following the
same "empty/absent degrades gracefully" pattern already used for
`OPENROUTER_API_KEY`.

### Important

LiveKit is optional. Do not allow LiveKit work to delay or break required
assignment functionality. If time becomes limited, mark this phase
deferred and document it.
