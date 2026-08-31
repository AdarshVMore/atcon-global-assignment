
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

- [ ] Implement login page.
- [ ] Implement signup page.
- [ ] Integrate actual backend authentication.
- [ ] Determine current user.
- [ ] Determine role.
- [ ] Implement recruiter route protection.
- [ ] Implement candidate route protection.
- [ ] Handle expired sessions.
- [ ] Handle authentication errors.
- [ ] Verify candidate/recruiter flows.

---

# Phase 4 — Recruiter Dashboard

- [ ] Implement overview page.
- [ ] Connect dashboard API.
- [ ] Display open jobs.
- [ ] Display application count.
- [ ] Display interviews.
- [ ] Display time-to-hire.
- [ ] Display pipeline health.
- [ ] Display recent activity.
- [ ] Display upcoming interviews.
- [ ] Add loading state.
- [ ] Add empty state.
- [ ] Add error state.
- [ ] Verify responsive behavior.

---

# Phase 5 — Jobs

- [ ] Jobs list.
- [ ] Search/filter.
- [ ] Job details.
- [ ] Create job.
- [ ] Edit job.
- [ ] Job status.
- [ ] Job stages.
- [ ] Job pipeline summary.
- [ ] Form validation.
- [ ] Mutation handling.
- [ ] Query invalidation.
- [ ] Loading states.
- [ ] Empty states.
- [ ] Error states.

---

# Phase 6 — Candidates

- [ ] Candidate search.
- [ ] Candidate filters.
- [ ] Candidate result cards.
- [ ] Candidate match score.
- [ ] Candidate profile.
- [ ] Candidate experience section.
- [ ] Candidate skills.
- [ ] Resume section.
- [ ] Application information.
- [ ] Candidate drawer.
- [ ] Candidate actions.
- [ ] Loading states.
- [ ] Empty states.
- [ ] Error states.

---

# Phase 7 — Pipeline

- [ ] Job-specific pipeline.
- [ ] Pipeline columns from backend stages.
- [ ] Application cards.
- [ ] Candidate match score.
- [ ] Stage filtering.
- [ ] Candidate drawer.
- [ ] Move candidate between stages.
- [ ] Connect stage mutation to backend.
- [ ] Handle transition errors.
- [ ] Refresh/invalidate affected queries.
- [ ] Show stage history.
- [ ] Add loading state.
- [ ] Add empty state.
- [ ] Verify desktop layout.
- [ ] Verify smaller-screen behavior.

Do not implement fake drag-and-drop if backend state transitions are not correctly integrated.

---

# Phase 8 — Interviews and Scorecards

- [ ] Interview list.
- [ ] Interview details.
- [ ] Schedule interview.
- [ ] Reschedule interview.
- [ ] Cancel interview.
- [ ] Interview status.
- [ ] Join interview action if LiveKit exists.
- [ ] Scorecard form.
- [ ] Submit scorecard.
- [ ] Display submitted scorecard.
- [ ] Handle validation errors.
- [ ] Handle loading/error states.

---

# Phase 9 — Candidate Experience

- [ ] Candidate home.
- [ ] Job discovery.
- [ ] Job search.
- [ ] Job detail.
- [ ] Apply flow.
- [ ] Application list.
- [ ] Application detail.
- [ ] Application pipeline/status.
- [ ] Profile.
- [ ] Resume upload.
- [ ] Resume processing state.
- [ ] Resume parsing result.
- [ ] Candidate interviews.
- [ ] Loading/empty/error states.

---

# Phase 10 — Notifications

- [ ] Notification UI.
- [ ] Notification list/dropdown.
- [ ] Read/unread state if backend supports it.
- [ ] Relevant application notifications.
- [ ] Relevant interview notifications.
- [ ] Handle empty state.

---

# Phase 11 — Polish

- [ ] Review spacing.
- [ ] Review typography.
- [ ] Review visual hierarchy.
- [ ] Review borders.
- [ ] Review radius.
- [ ] Review button consistency.
- [ ] Review forms.
- [ ] Review loading states.
- [ ] Review empty states.
- [ ] Review errors.
- [ ] Review mobile layouts.
- [ ] Remove unnecessary animations.
- [ ] Remove duplicated components.
- [ ] Remove unnecessary abstractions.
- [ ] Remove fake/mock data where backend data exists.
- [ ] Verify accessibility basics.
- [ ] Verify keyboard navigation.
- [ ] Verify focus states.

---

# Phase 12 — Final Integration

- [ ] Run backend and frontend together.
- [ ] Verify authentication.
- [ ] Verify recruiter workflow.
- [ ] Create job.
- [ ] Configure pipeline.
- [ ] Apply as candidate.
- [ ] Verify application appears.
- [ ] Verify resume processing.
- [ ] Verify ranking result.
- [ ] Move application through pipeline.
- [ ] Schedule interview.
- [ ] Submit scorecard.
- [ ] Verify dashboard metrics.
- [ ] Verify notifications.
- [ ] Verify candidate application status.
- [ ] Verify error handling.
- [ ] Run TypeScript.
- [ ] Run tests.
- [ ] Run production build.
- [ ] Fix integration issues.
- [ ] Update documentation.