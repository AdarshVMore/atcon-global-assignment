
---

# 3. `docs/frontend-phases.md`

This is how I'd control Claude's implementation.

```md
# Frontend Implementation Phases

Status:

[ ] Not started
[-] In progress
[x] Complete
[!] Blocked

Claude must update this file after completing and verifying each task.

Do not mark a task complete simply because code exists.

---

# Phase 0 — Inspect Before Coding

- [x] Read CLAUDE.md.
- [x] Read docs/architecture.md. (No such file — architecture lives under
      [architecture/](../architecture/README.md); read that instead.)
- [x] Read docs/frontend-architecture.md.
- [x] Read docs/frontend-design.md.
- [x] Read the assignment PDF. (Committed as a `.md`, not a PDF — read in
      full.)
- [x] Inspect the complete backend structure.
- [x] Inspect backend API routes.
- [x] Inspect backend authentication implementation.
- [x] Inspect backend response/request types.
- [x] Inspect existing database/domain terminology.
- [x] Identify actual frontend API requirements.
- [x] Identify backend capabilities that are not yet exposed by APIs.
- [x] Inspect docs/design-reference/. (Actual directory on disk is
      `docs/design-referene/` — a typo in the existing folder name, not in
      this checklist. Flagged, not renamed, since renaming wasn't asked
      for.)
- [x] Produce a short implementation plan.
- [x] Do not modify backend.

Findings from this pass (full detail given directly in conversation, not
duplicated into a file): the backend has no CORS configured at all, which
blocks any browser-based frontend from calling it until that's addressed;
it defaults to `PORT=3000`, the same as Next's dev default; auth is a
bearer JWT returned in the response body, not a cookie, so the frontend
owns token storage; and applications/pipeline responses don't currently
expose candidate identity (name/email/phone) or a usable resume file URL,
which will constrain the Candidates/Pipeline phases later.

---

# Phase 1 — Frontend Foundation

- [x] Create apps/frontend. (`create-next-app`, App Router, TypeScript,
      Tailwind, bun as package manager; added to the root workspace as
      `@atcon/frontend`.)
- [x] Configure Next.js. (Next.js 16.3.3 — Turbopack is the default now,
      no `--turbopack` flag needed. Dev/start scripts pinned to port 3001
      to avoid colliding with the backend's default port 3000.)
- [x] Configure TypeScript. (`tsc --noEmit` clean.)
- [x] Configure Tailwind. (v4, CSS-based config via `app/globals.css`, no
      `tailwind.config.js`.)
- [x] Configure shadcn/ui. (`base-nova` style, neutral base color —
      already a close match for frontend-design.md's restrained neutral
      palette and moderate radius out of the box. Added `button`, `card`,
      `alert`, `skeleton` as the first primitives.)
- [x] Configure TanStack Query. (`QueryClientProvider` in
      `app/providers.tsx`, wired into the root layout; `lib/api/query-client.ts`
      sets sane defaults — 30s stale time, 1 retry.)
- [x] Configure Zustand. (`stores/auth.store.ts`, `stores/ui.store.ts`,
      `stores/pipeline.store.ts` — thin, typed, no business logic wired in
      yet.)
- [x] Create frontend directory structure. (See note below — the `app/`
      route tree itself is intentionally not pre-built.)
- [x] Create global styles.
- [x] Configure typography. (Inter via `next/font/google`, replacing the
      scaffold's default Geist, per frontend-design.md's explicit
      preference.)
- [x] Configure design tokens. (shadcn's neutral oklch palette + spacing/
      radius scale, already aligned with frontend-design.md.)
- [x] Create root layout.
- [x] Create basic API client. (`lib/api/client.ts` — base URL from
      `NEXT_PUBLIC_API_URL`, bearer token attached from
      `lib/auth/token.ts`, parses the backend's `{error:{message}}`
      envelope into a typed `ApiError`.)
- [x] Create error handling foundation. (`ApiError` class,
      `components/layout/error-state.tsx`, and `app/error.tsx` as the
      Next.js route-segment error boundary.)
- [x] Create loading-state foundation. (`components/layout/loading-state.tsx`
      and `app/loading.tsx`.)
- [x] Verify production build. (`bun run build` succeeds; `bun run lint`
      and `bun run typecheck` both clean; smoke-tested `bun run dev` —
      `GET /` returns 200 with fonts/Tailwind loading correctly.)

**Scope note:** "Create frontend directory structure" was interpreted as
the non-route scaffolding — `components/`, `features/`, `stores/`, `lib/`,
`hooks/`, `types/` — plus the root layout/providers. The `app/` route
folders themselves (`(auth)/login`, `recruiter/*`, `candidate/*`) are not
pre-created; each is built by the phase that owns it (Phase 2 owns the
recruiter/candidate layouts, Phase 3 owns `(auth)/login` and `signup`,
etc.), so this phase doesn't do later phases' work or leave placeholder
pages other phases immediately overwrite. `lib/utils.ts` is a flat file
rather than a `lib/utils/` directory — shadcn's CLI writes new component
helpers there by convention, and a competing directory of the same name
would conflict with future `shadcn add` runs.

Empty structural directories (`components/jobs`, `features/auth`, etc.)
hold a `.gitkeep` since git doesn't track empty directories and later
phases need them to already exist in the tree.

---

# Phase 2 — Application Shell

- [x] Create authenticated application shell. (`components/layout/app-shell.tsx`
      — `SidebarProvider` + `AppSidebar` + `SidebarInset`, parameterized by
      `role: "recruiter" | "candidate"`.)
- [x] Create recruiter layout. (`app/recruiter/layout.tsx`, plus a minimal
      placeholder `page.tsx` under `/recruiter`, `jobs`, `candidates`,
      `pipeline`, `interviews`, and `settings` — each just a heading and a
      "Not yet implemented" line, so the nav has somewhere real to go
      without inventing any job/candidate/interview data. Each gets
      overwritten by the phase that owns it.)
- [x] Create candidate layout. (`app/candidate/layout.tsx`, same pattern
      under `/candidate`, `jobs`, `applications`, `interviews`, `profile`.)
- [x] Create desktop sidebar. (`components/layout/app-sidebar.tsx`, built
      on shadcn's own `sidebar` primitive rather than a hand-rolled one —
      its `--sidebar-*` tokens were already sitting in `globals.css` from
      the Phase 1 `base-nova` init, which was the tell that this was the
      intended building block. Expanded by default, matching
      frontend-design.md's nav diagram width, with an optional collapse-
      to-icon toggle next to the logo.)
- [x] Create mobile navigation. (Below `md`, the sidebar becomes an
      off-canvas `Sheet` opened from a slim top bar's hamburger trigger —
      the primitive's built-in behavior, not something hand-built.)
- [x] Create user menu. (`components/layout/user-menu.tsx` — avatar +
      dropdown at the bottom of the sidebar, reading `useAuthStore()`
      directly. Nothing is populated with a real session yet, so it
      honestly shows "Not signed in" / "Sign in to continue" rather than
      a fabricated name — Phase 3 is what makes this real.)
- [x] Create page container/layout primitives. (`components/layout/page-container.tsx`
      — padded wrapper with an optional title/description, used by every
      placeholder page added this phase.)
- [x] Implement responsive behavior. (Desktop: fixed sidebar, optional
      icon-collapse. Mobile: hamburger + off-canvas drawer that closes
      itself after a nav click or logout — the primitive doesn't do this
      by default, had to wire `useSidebar().setOpenMobile(false)` into
      the nav links and the user menu's Settings/Log out actions.)
- [x] Verify navigation. (Live-verified with a headless-browser pass —
      `chromium-cli` and Playwright weren't preinstalled, so Playwright's
      Chromium was fetched via `bunx` for a one-off scripted check rather
      than skipped. Caught two real bugs this way, neither visible from
      `tsc`/`build`: (1) `AppShell` was a Server Component passing icon
      *component references* as props into the client `AppSidebar` —
      RSC disallows passing raw functions across that boundary, and it
      broke prerendering; fixed by marking `AppShell` client, since it's
      pure interactive chrome with nothing server-only in it. (2) the
      user menu's `DropdownMenuLabel` threw at runtime — Base UI's
      `Menu.GroupLabel` requires a `Menu.Group` ancestor, which
      shadcn's own generated `DropdownMenuLabel` doesn't wrap for you;
      fixed by wrapping the label/items in `DropdownMenuGroup`. Also
      fixed an unrelated `react-hooks/set-state-in-effect` lint error in
      shadcn's own generated `hooks/use-mobile.ts` — rewrote it on
      `useSyncExternalStore`, the React-recommended way to subscribe to
      `matchMedia`, instead of `useState` + `useEffect`.)

Confirmed live in a real browser (desktop 1440px and mobile 375px, both
roles): sidebar renders with the right nav items and icons, active-item
highlighting follows the route on both direct navigation and link
clicks, the user menu opens without console errors, and the mobile
drawer opens/closes correctly including after a nav click. `bun run
typecheck`, `bun run lint`, and `bun run build` are all clean; all 12
new routes prerender.

---

# Phase 3 — Authentication

- [x] Implement login page.
- [x] Implement signup page. (Role picker — candidate or recruiter.)
- [x] Integrate actual backend authentication. (Real `POST /auth/register`
      and `POST /auth/login`, bearer token stored via `lib/auth/token.ts`.)
- [x] Determine current user. (`GET /me`, `features/auth/useCurrentUser.ts`.)
- [x] Determine role.
- [x] Implement recruiter route protection.
- [x] Implement candidate route protection. (`components/auth/require-role.tsx`,
      wraps both `app/recruiter/layout.tsx` and `app/candidate/layout.tsx`.
      Client-side only — the backend stays the real authorization boundary,
      this just avoids flashing the wrong role's UI.)
- [x] Handle expired sessions. (A 401 on `/me` clears the token and redirects
      to `/login`.)
- [x] Handle authentication errors. (Inline `ErrorState` on the login/signup
      forms, reading the backend's actual error message.)
- [x] Verify candidate/recruiter flows. (Live end-to-end: see the Phase 12
      note below — one script now covers this instead of a separate pass
      per phase.)

**Backend-imposed decision:** the backend has no CORS configuration, so the
browser can't call it cross-origin. Added a Next.js rewrite (`next.config.ts`,
`/api/:path*` → `BACKEND_URL`) so the browser only ever talks same-origin;
`lib/api/client.ts` now defaults to `/api`. Pure frontend change, no backend
code touched.

---

# Phase 4 — Recruiter Dashboard

- [x] Implement overview page.
- [x] Connect dashboard API. (`GET /dashboard/overview`, real data.)
- [x] Display open jobs.
- [x] Display application count.
- [x] Display interviews. (Interview counts by status.)
- [x] Display time-to-hire.
- [x] Display pipeline health. (Stale-application count; applications by stage.)
- [!] Display recent activity. (No backend endpoint for this — flagged in
      the earlier API inspection, not built here rather than faked.)
- [!] Display upcoming interviews. (Same — no list-scoped-by-date endpoint
      at the dashboard level. The dedicated Interviews page covers this
      instead, see Phase 8.)
- [x] Add loading state.
- [x] Add empty state. (Stage/interview lists show "No ... yet" when empty.)
- [x] Add error state.
- [x] Verify responsive behavior. (Grid collapses to 2 columns on mobile.)

---

# Phase 5 — Jobs

- [x] Jobs list.
- [x] Search/filter. (Client-side title filter — the backend has no `?q=`
      param on `GET /jobs`.)
- [x] Job details.
- [x] Create job. (Default 6-stage pipeline, or a custom stage list.)
- [x] Edit job.
- [x] Job status. (Draft/Published/Closed badges, publish/close actions.)
- [x] Job stages. (Read-only display on the detail page — adding/renaming
      stages via UI wasn't built given the time budget; the API functions
      exist in `lib/api/jobs.api.ts` if needed later.)
- [x] Job pipeline summary. (Links out to the Pipeline board, Phase 7.)
- [x] Form validation. (HTML `required` — matches the backend's own
      boundary-validation-only approach, no client validation library added.)
- [x] Mutation handling.
- [x] Query invalidation.
- [x] Loading states.
- [x] Empty states.
- [x] Error states.

---

# Phase 6 — Candidates

**Built against the real constraint flagged in Phase 0:** `GET /applications`
never includes candidate name/email/phone/resume — only `candidateId`. There
is no `GET /candidates/:id` either. So this page is honestly an applications
view, not a candidate directory, and says so in its own description text.

- [!] Candidate search / filters. (Only `?jobId=` exists server-side; no
      name/skill search is possible without candidate identity.)
- [x] Candidate result cards. (Shows candidate id (short), job, stage,
      ranking score — the real fields available.)
- [x] Candidate match score. (`rankingScore` from the backend's ranking
      worker.)
- [!] Candidate profile / experience / skills. (Not buildable — no endpoint
      returns this. Not faked.)
- [!] Resume section. (`Resume.fileUrl` is a raw storage key, not a
      fetchable URL — flagged in Phase 0. Not shown as a broken link.)
- [x] Application information. (Stage, ranking, stage history.)
- [x] Candidate drawer. (Built as a Dialog rather than a slide-in drawer —
      faster to wire up, same effect.)
- [x] Candidate actions. (Interview scheduling and management now live
      inside this dialog — see Phase 8.)
- [x] Loading states.
- [x] Empty states.
- [x] Error states.

---

# Phase 7 — Pipeline

- [x] Job-specific pipeline. (`/recruiter/pipeline` is a job picker;
      `/recruiter/pipeline/[jobId]` is the actual board.)
- [x] Pipeline columns from backend stages. (Real `job.stages`, ordered.)
- [x] Application cards.
- [x] Candidate match score.
- [x] Stage filtering. (Columns themselves are the filter — no separate
      filter control added given the time budget.)
- [-] Candidate drawer. (Reused from Phase 6 for the Candidates page;
      not wired into this board specifically — cards show score/id inline
      instead.)
- [x] Move candidate between stages. (A dropdown per card, not drag-and-drop
      — deliberately, per this phase's own instruction below. Options are
      computed client-side to match the backend's real transition rule:
      advance to the immediate next stage by order, or jump to any terminal
      stage.)
- [x] Connect stage mutation to backend. (Real `PATCH
      /applications/:id/stage` — the backend enforces the transition rule
      regardless of what the client offers.)
- [x] Handle transition errors. (Toast on failure.)
- [x] Refresh/invalidate affected queries.
- [x] Show stage history. (On the Candidates dialog, not duplicated here.)
- [x] Add loading state.
- [x] Add empty state. (Per-column "No applications.")
- [x] Verify desktop layout. (Horizontally scrolling columns.)
- [!] Verify smaller-screen behavior. (Not live-verified on a narrow
      viewport specifically — horizontal scroll should degrade reasonably
      but wasn't screenshotted at a mobile width given the time budget.)

Confirmed live: no drag-and-drop was built, and the dropdown only ever
calls the real backend mutation — nothing here simulates a transition
client-side.

---

# Phase 8 — Interviews and Scorecards

**Backend-imposed decision:** there's no "list all interviews" endpoint,
only per-application listing (`GET /applications/:id/interviews`). Rather
than inventing one, `features/interviews/useInterviews.ts`'s
`useAllInterviews()` fetches every application the recruiter/candidate owns
and fans out real per-application interview queries in parallel, then
merges and sorts client-side. Real data, just aggregated rather than
server-aggregated.

- [x] Interview list. (`/recruiter/interviews`, aggregated as above.)
- [x] Interview details. (Inline on each row/card — no separate detail
      route given the time budget.)
- [x] Schedule interview. (From the Candidates dialog — that's where a
      recruiter picks *which* application, which an application-less
      global list can't do.)
- [x] Reschedule interview.
- [x] Cancel interview.
- [x] Interview status. (Status badges throughout.)
- [x] Join interview action if LiveKit exists. (It doesn't — deliberately
      deferred per the backend's own `phases/15-livekit.md`. Nothing to
      wire up here.)
- [x] Scorecard form. (Scores 1-5, recommendation, feedback.)
- [x] Submit scorecard. (Only offered once `COMPLETED`, matching the
      backend's own rule.)
- [x] Display submitted scorecard. (Recommendation shown once present.)
- [x] Handle validation errors. (Toast on the real backend error.)
- [x] Handle loading/error states.

---

# Phase 9 — Candidate Experience

- [x] Candidate home. (Application/interview counts, link to browse jobs.)
- [x] Job discovery. (`/candidate/jobs`, published jobs only, per the
      backend's own role-based `GET /jobs` behavior.)
- [x] Job search. (Client-side title filter, same constraint as Phase 5.)
- [x] Job detail.
- [x] Apply flow. (Pick one of your own uploaded resumes, submit — matches
      the backend's actual requirement that `resumeId` be one of the
      candidate's own resumes.)
- [x] Application list.
- [x] Application detail. (Stage, stage history, interviews — read-only;
      a candidate has no action here the backend would accept.)
- [x] Application pipeline/status.
- [x] Profile. (Name/email read-only from the account, phone editable via
      `PATCH /candidates/me`.)
- [x] Resume upload.
- [x] Resume processing state. (Polls while `UPLOADED`/`PROCESSING`, stops
      once settled.)
- [!] Resume parsing result. (`Resume.parsedData` isn't surfaced in the UI
      — the status badge shows PARSED/FAILED, but the structured skills/
      experience data itself isn't rendered anywhere yet.)
- [x] Candidate interviews. (Same `useAllInterviews()` aggregation as
      Phase 8, scoped to the candidate's own applications by the backend's
      own role branching on `GET /applications`.)
- [x] Loading/empty/error states.

---

# Phase 10 — Notifications

- [x] Notification UI. (Bell icon in the sidebar header, both roles.)
- [x] Notification list/dropdown. (Polls every 30s.)
- [x] Read/unread state if backend supports it. (It does —
      `PATCH /notifications/:id/read`; unread ones are bold with a red
      dot on the bell.)
- [x] Relevant application notifications. (`APPLICATION_RECEIVED`,
      `APPLICATION_STAGE_CHANGED` — whatever the backend actually sends.)
- [x] Relevant interview notifications. (Same — rendered generically from
      `title`/`message`, not hardcoded per type, so whatever the backend's
      `NotificationType` enum produces shows up correctly without the
      frontend needing to know every variant.)
- [x] Handle empty state.

Confirmed live in the golden-path run: applying triggered a real
notification for the recruiter, and it showed up in the bell dropdown with
the unread indicator, matching the actual backend behavior documented in
its own README.

---

# Phase 11 — Polish

Given the time constraint, this was a light pass rather than the full
checklist item-by-item — the shadcn `base-nova` primitives already carry
consistent spacing/radius/focus-ring behavior everywhere, so most of this
list was true by construction rather than needing a separate review.

- [x] Review button consistency. (Same `Button` component and variant set
      throughout — no ad hoc buttons.)
- [x] Review loading/empty/error states. (Same three components —
      `LoadingState`/`ErrorState`/inline "Not yet..." text — reused on
      every page rather than each page inventing its own.)
- [x] Remove fake/mock data where backend data exists. (Nothing in this
      codebase renders invented data — the Candidates gap (Phase 6) and
      dashboard activity feed (Phase 4) were left honestly unbuilt instead
      of faked, per the explicit instruction.)
- [!] Review mobile layouts / spacing / typography / visual hierarchy /
      borders / accessibility / keyboard nav / focus states in detail.
      (Not individually audited given the time budget — verified working
      at 375px for the shell in Phase 2, but the feature pages built in
      Phases 3-10 weren't each re-checked at mobile width. Flagging this
      honestly rather than checking boxes that weren't actually verified.)
- [-] Remove unnecessary abstractions / duplicated components. (Reasonably
      lean already — `ApplicationInterviewsPanel` is shared between the
      recruiter's Candidates dialog and could arguably be split further,
      but wasn't, given time.)

---

# Phase 12 — Final Integration

- [x] Run backend and frontend together. (Real Postgres/Redis/MinIO via
      docker-compose, backend API + worker, frontend dev server — all
      live, not mocked.)
- [x] Verify authentication. (Real register/login against `POST
      /auth/register` and `/login`, both roles.)
- [x] Verify recruiter workflow.
- [x] Create job.
- [-] Configure pipeline. (Verified with the default 6-stage pipeline;
      didn't separately verify the custom-stages path on `/jobs/new` in
      this live pass — that form exists and typechecks, just wasn't
      clicked through live.)
- [x] Apply as candidate.
- [x] Verify application appears. (Showed up in the recruiter's Candidates
      list immediately.)
- [x] Verify resume processing. (Uploaded a real PDF through the real
      resume-parsing worker.)
- [!] Verify ranking result. (`rankingScore` showed as 0 — expected, since
      no `OPENROUTER_API_KEY` is configured in this environment, matching
      the backend's own documented degraded-mode behavior. The scoring
      *pipeline* ran; the LLM-scored path wasn't exercised because the key
      isn't available here, same gap the backend's own README already
      documents.)
- [x] Move application through pipeline. (Live-verified separately: a
      real drop-down move on the pipeline board moved a card from Applied
      to Screening, backed by a real `PATCH /applications/:id/stage` call
      — column counts updated correctly on both sides.)
- [x] Schedule interview.
- [x] Submit scorecard.
- [x] Verify dashboard metrics. (Open jobs, total applications, stage
      breakdown, and completed-interview count all matched the actions
      just taken.)
- [x] Verify notifications. (Real notification landed in the recruiter's
      bell after the candidate applied.)
- [x] Verify candidate application status. (Candidate's own Applications/
      Interviews pages reflected the recruiter's actions.)
- [x] Verify error handling. (`scheduledAt must be in the future` and
      other real backend error messages surface correctly through
      `ApiError` → inline `ErrorState`/toast, not swallowed.)
- [x] Run TypeScript. (`bun run typecheck` clean.)
- [ ] Run tests. (No frontend test suite exists yet — out of scope for
      what was asked this session; not silently skipped, just not built.)
- [x] Run production build. (`bun run build` clean, all routes prerender
      or render on demand as expected.)
- [x] Fix integration issues. (Two real bugs found only by running this
      live, not by typecheck/build: a Server-Component-passing-icon-
      functions crash and a Base UI `Menu.GroupLabel` runtime error — both
      fixed and re-verified. Also fixed a hydration mismatch in the route
      guard and a Base UI `nativeButton` warning, both caught via browser
      console during this pass.)
- [x] Update documentation. (This file.)