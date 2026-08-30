# Phase 3 — Authentication and RBAC

[← Back to index](README.md)

## Goal

Implement authentication and Candidate/Recruiter authorization. See
[architecture/auth.md](../architecture/auth.md).

### Tasks

- [ ] Implement registration.
- [ ] Implement login.
- [ ] Implement password hashing.
- [ ] Implement session/token mechanism.
- [ ] Implement Candidate role.
- [ ] Implement Recruiter role.
- [ ] Add authentication middleware.
- [ ] Add authorization checks.
- [ ] Protect recruiter endpoints.
- [ ] Protect candidate-owned resources.
- [ ] Add authentication tests.
- [ ] Add authorization tests.
- [ ] Verify unauthorized access behavior.

### Verification

- Candidate can authenticate.
- Recruiter can authenticate.
- Candidate cannot perform recruiter-only actions.
- Resource ownership is enforced.
- Authentication failures are handled clearly.
