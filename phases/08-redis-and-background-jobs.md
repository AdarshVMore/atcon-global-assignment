# Phase 8 — Redis and Background Jobs

[← Back to index](README.md)

## Goal

Introduce asynchronous job processing. See
[architecture/background-jobs.md](../architecture/background-jobs.md).

### Tasks

- [ ] Configure Redis.
- [ ] Choose and configure the queue implementation.
- [ ] Create queue abstraction.
- [ ] Create worker abstraction.
- [ ] Configure retries.
- [ ] Configure failed-job handling.
- [ ] Add worker logging.
- [ ] Create `resume.parse` queue.
- [ ] Create `application.rank` queue.
- [ ] Create `notification.send` queue.
- [ ] Verify API can enqueue jobs.
- [ ] Verify workers consume jobs.
- [ ] Verify retry behavior.
- [ ] Document how to run workers locally.

### Verification

- API can enqueue jobs.
- Workers consume jobs.
- Failed jobs retry.
- Duplicate execution is considered.
- Redis is not used as business-state storage.
