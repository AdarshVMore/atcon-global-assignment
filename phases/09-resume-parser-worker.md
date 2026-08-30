# Phase 9 — Resume Parser Worker

[← Back to index](README.md)

## Goal

Parse resumes asynchronously. See
[architecture/resume-processing.md](../architecture/resume-processing.md).

### Tasks

- [ ] Create ResumeParserWorker.
- [ ] Retrieve resume from object storage.
- [ ] Extract text from supported resume formats.
- [ ] Define structured candidate extraction output.
- [ ] Add OpenRouter SDK integration where LLM extraction is useful.
- [ ] Configure a cost-effective default model.
- [ ] Make the model configurable.
- [ ] Parse candidate information.
- [ ] Update candidate profile.
- [ ] Update resume processing status.
- [ ] Handle parsing failures.
- [ ] Handle LLM failures.
- [ ] Implement retry behavior.
- [ ] Make processing idempotent.
- [ ] Add worker tests where practical.
- [ ] Verify upload → queue → parse → database flow.

### Verification

- Resume upload does not wait for parsing.
- Worker processes resume asynchronously.
- Candidate profile can be updated from parsed data.
- Resume status becomes PARSED or FAILED.
- LLM failure does not destroy the original resume.
- Retry does not corrupt candidate data.
- OpenRouter model is configurable.
