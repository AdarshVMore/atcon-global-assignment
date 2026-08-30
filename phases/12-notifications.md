# Phase 12 — Notifications

[← Back to index](README.md)

## Goal

Notify users about important recruitment events. See
[architecture/background-jobs.md](../architecture/background-jobs.md#notifications).

### Tasks

- [ ] Define notification types.
- [ ] Implement NotificationService.
- [ ] Queue notification jobs.
- [ ] Implement NotificationWorker.
- [ ] Add in-app notifications.
- [ ] Add email abstraction if practical.
- [ ] Notify candidate about relevant application changes.
- [ ] Notify recruiter about relevant candidate events.
- [ ] Handle notification failures.
- [ ] Add notification tests.

### Verification

- Notifications are asynchronous where appropriate.
- Notification failure does not break core business operations.
- Notification state is understandable.
