# Frontend Architecture

## Purpose

This is the frontend for the ATS / recruitment assignment.

The frontend must expose the backend's recruitment workflow clearly:

Candidate
→ Job
→ Application
→ Pipeline
→ Interview
→ Scorecard
→ Hired

The recruiter experience is the primary experience.

The candidate experience should be complete but intentionally simpler.

The frontend should make the backend architecture visible through the UI without exposing unnecessary implementation details.

---

# Technology

Use:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- TanStack Query
- React Hook Form where forms become sufficiently complex

Do not introduce another UI component library.

Do not introduce Redux unless a real requirement appears that Zustand + TanStack Query cannot reasonably handle.

---

# State Management

There are two categories of state.

## Client State

Use Zustand for small pieces of client-side state that need to be shared between components.

Examples:

- authenticated user/session metadata if required by the frontend architecture
- selected candidate
- candidate drawer open/closed
- pipeline filters
- UI preferences
- temporary UI state
- active navigation state when necessary

Do not put server data into Zustand merely because it came from an API.

---

## Server State

Use TanStack Query for data obtained from the backend.

Examples:

- jobs
- candidates
- applications
- pipeline data
- interviews
- scorecards
- notifications
- dashboard metrics
- resume processing status

Server data should generally follow:

API
↓
TanStack Query
↓
React components

Do not duplicate the same server data in Zustand.

---

# API Layer

Do not call `fetch()` directly throughout components.

Create a small API layer.

Suggested structure:

lib/
└── api/
    ├── client.ts
    ├── auth.api.ts
    ├── jobs.api.ts
    ├── candidates.api.ts
    ├── applications.api.ts
    ├── interviews.api.ts
    ├── resumes.api.ts
    └── dashboard.api.ts

The exact files should follow actual backend API boundaries.

The API client should centralize:

- base URL
- authentication handling
- common request behavior
- response parsing
- basic error handling

Do not build an overly abstract API framework.

---

# Authentication

Before implementing frontend authentication, inspect the backend authentication implementation.

Determine:

- how login works
- how registration works
- whether authentication uses cookies or tokens
- how the backend expects credentials
- how the current user is retrieved
- how roles are represented

Do NOT invent a token-storage strategy without inspecting the backend.

Prefer secure HTTP-only cookies when the backend supports them.

Do not store sensitive authentication tokens in localStorage unless the backend architecture explicitly requires it.

---

# Role-Based Routing

There are two roles:

- Candidate
- Recruiter

The frontend should provide separate experiences.

Conceptually:

/recruiter/*
/candidate/*

Unauthenticated users:

/login
/signup

After authentication:

Candidate
→ /candidate

Recruiter
→ /recruiter

Protect routes according to the actual backend authentication mechanism.

Do not treat frontend route protection as the actual security boundary.

The backend remains authoritative for authorization.

---

# Directory Structure

Create this structure before feature implementation.

```text
apps/frontend/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   │
│   ├── recruiter/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   │
│   │   ├── jobs/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [jobId]/
│   │   │       ├── page.tsx
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   │
│   │   ├── candidates/
│   │   │   ├── page.tsx
│   │   │   └── [candidateId]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── pipeline/
│   │   │   └── [jobId]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── interviews/
│   │   │   ├── page.tsx
│   │   │   └── [interviewId]/
│   │   │       └── page.tsx
│   │   │
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── candidate/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   │
│   │   ├── jobs/
│   │   │   ├── page.tsx
│   │   │   └── [jobId]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── applications/
│   │   │   ├── page.tsx
│   │   │   └── [applicationId]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   │
│   │   └── interviews/
│   │       └── page.tsx
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── jobs/
│   ├── candidates/
│   ├── applications/
│   ├── pipeline/
│   ├── interviews/
│   └── dashboard/
│
├── features/
│   ├── auth/
│   ├── jobs/
│   ├── candidates/
│   ├── applications/
│   ├── interviews/
│   └── dashboard/
│
├── stores/
│   ├── auth.store.ts
│   ├── ui.store.ts
│   └── pipeline.store.ts
│
├── lib/
│   ├── api/
│   ├── auth/
│   └── utils/
│
├── hooks/
│
├── types/
│
├── public/
│
├── package.json
└── tsconfig.json