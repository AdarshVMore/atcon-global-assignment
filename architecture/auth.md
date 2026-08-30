# Authentication & Authorization

Support two roles: **Candidate** and **Recruiter**.

Authorization must happen on the backend — never rely on frontend
visibility for security.

- Candidates should only access resources they are allowed to access
  (their own profile, resumes, and applications).
- Recruiters should only perform recruiter operations (managing jobs
  they own, viewing applicants, moving pipeline stages, scheduling
  interviews).

Use clear, explicit authorization checks. Do not create an unnecessarily
complicated authorization framework — role checks plus resource-ownership
checks are sufficient for this system.
