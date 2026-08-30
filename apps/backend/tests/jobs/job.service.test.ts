import { describe, expect, test } from "bun:test";
import { JobStatus, Role, type Job, type JobStage } from "@atcon/database";
import { JobService } from "../../src/modules/jobs/job.service.ts";
import type { JobRepository, JobWithStages } from "../../src/modules/jobs/job.repository.ts";

const RECRUITER_ID = "recruiter-1";
const OTHER_RECRUITER_ID = "recruiter-2";
const CANDIDATE_ID = "candidate-1";

function buildJob(overrides: Partial<JobWithStages> = {}): JobWithStages {
  const base: Job = {
    id: "job-1",
    recruiterId: RECRUITER_ID,
    title: "Backend Engineer",
    description: "Build things",
    requirements: "TypeScript",
    status: JobStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...base, stages: [], ...overrides };
}

function buildStage(overrides: Partial<JobStage> = {}): JobStage {
  return {
    id: "stage-1",
    jobId: "job-1",
    name: "Applied",
    order: 1,
    isTerminal: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function fakeRepository(overrides: Partial<JobRepository> = {}): JobRepository {
  return {
    create: async (input) =>
      buildJob({
        recruiterId: input.recruiterId,
        title: input.title,
        description: input.description,
        requirements: input.requirements,
        stages: input.stages.map((stage, index) => buildStage({ id: `stage-${index + 1}`, ...stage })),
      }),
    findById: async () => null,
    findPublished: async () => [],
    findByRecruiter: async () => [],
    update: async (_id, data) => buildJob(data as Partial<JobWithStages>),
    addStage: async () => buildStage(),
    updateStage: async () => buildStage(),
    ...overrides,
  } as JobRepository;
}

describe("JobService.createJob", () => {
  test("applies the default stage pipeline when none is provided", async () => {
    const service = new JobService(fakeRepository());

    const job = await service.createJob(RECRUITER_ID, {
      title: "Backend Engineer",
      description: "Build things",
      requirements: "TypeScript",
    });

    expect(job.stages.map((stage) => stage.name)).toEqual([
      "Applied",
      "Screening",
      "Interview",
      "Offer",
      "Hired",
      "Rejected",
    ]);
  });

  test("rejects duplicate stage names", async () => {
    const service = new JobService(fakeRepository());

    await expect(
      service.createJob(RECRUITER_ID, {
        title: "Backend Engineer",
        description: "Build things",
        requirements: "TypeScript",
        stages: [{ name: "Applied" }, { name: "applied" }],
      }),
    ).rejects.toThrow("Stage names must be unique within a job");
  });

  test("rejects a missing title", async () => {
    const service = new JobService(fakeRepository());

    await expect(
      service.createJob(RECRUITER_ID, { title: "", description: "Build things", requirements: "TypeScript" }),
    ).rejects.toThrow("Job title is required");
  });
});

describe("JobService.getJobForViewer", () => {
  test("lets anyone view a published job", async () => {
    const job = buildJob({ status: JobStatus.PUBLISHED });
    const service = new JobService(fakeRepository({ findById: async () => job }));

    const result = await service.getJobForViewer("job-1", { id: CANDIDATE_ID, email: "c@atcon.dev", role: Role.CANDIDATE });

    expect(result.id).toBe("job-1");
  });

  test("hides a draft job from everyone except its owner", async () => {
    const job = buildJob({ status: JobStatus.DRAFT });
    const service = new JobService(fakeRepository({ findById: async () => job }));

    await expect(
      service.getJobForViewer("job-1", { id: CANDIDATE_ID, email: "c@atcon.dev", role: Role.CANDIDATE }),
    ).rejects.toThrow("Job not found");
    await expect(
      service.getJobForViewer("job-1", { id: OTHER_RECRUITER_ID, email: "r2@atcon.dev", role: Role.RECRUITER }),
    ).rejects.toThrow("Job not found");

    const ownView = await service.getJobForViewer("job-1", {
      id: RECRUITER_ID,
      email: "r1@atcon.dev",
      role: Role.RECRUITER,
    });
    expect(ownView.id).toBe("job-1");
  });
});

describe("JobService ownership and state transitions", () => {
  test("rejects updates from a recruiter who doesn't own the job", async () => {
    const job = buildJob();
    const service = new JobService(fakeRepository({ findById: async () => job }));

    await expect(service.updateJob(OTHER_RECRUITER_ID, "job-1", { title: "New title" })).rejects.toThrow(
      "You do not own this job",
    );
  });

  test("rejects publishing a job with no stages", async () => {
    const job = buildJob({ stages: [] });
    const service = new JobService(fakeRepository({ findById: async () => job }));

    await expect(service.publishJob(RECRUITER_ID, "job-1")).rejects.toThrow(
      "A job needs at least one stage before it can be published",
    );
  });

  test("rejects publishing a job that isn't in DRAFT", async () => {
    const job = buildJob({ status: JobStatus.PUBLISHED, stages: [buildStage()] });
    const service = new JobService(fakeRepository({ findById: async () => job }));

    await expect(service.publishJob(RECRUITER_ID, "job-1")).rejects.toThrow("Cannot publish a job in PUBLISHED status");
  });

  test("publishes a draft job that has stages", async () => {
    const job = buildJob({ status: JobStatus.DRAFT, stages: [buildStage()] });
    const service = new JobService(
      fakeRepository({
        findById: async () => job,
        update: async (_id, data) => buildJob({ ...data, stages: job.stages } as Partial<JobWithStages>),
      }),
    );

    const published = await service.publishJob(RECRUITER_ID, "job-1");

    expect(published.status).toBe(JobStatus.PUBLISHED);
  });

  test("blocks edits to a closed job", async () => {
    const job = buildJob({ status: JobStatus.CLOSED });
    const service = new JobService(fakeRepository({ findById: async () => job }));

    await expect(service.updateJob(RECRUITER_ID, "job-1", { title: "New title" })).rejects.toThrow(
      "A closed job cannot be edited",
    );
    await expect(service.addStage(RECRUITER_ID, "job-1", { name: "Extra" })).rejects.toThrow(
      "Cannot modify stages on a closed job",
    );
  });

  test("rejects adding a stage whose name already exists on the job", async () => {
    const job = buildJob({ stages: [buildStage({ name: "Applied" })] });
    const service = new JobService(fakeRepository({ findById: async () => job }));

    await expect(service.addStage(RECRUITER_ID, "job-1", { name: "applied" })).rejects.toThrow(
      "A stage with this name already exists on this job",
    );
  });
});
