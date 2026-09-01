import { describe, expect, test } from "bun:test";
import { InterviewStatus, JobStatus } from "@atcon/database";
import { DashboardService } from "../../src/modules/dashboard/dashboard.service.ts";
import type { DashboardRepository } from "../../src/modules/dashboard/dashboard.repository.ts";
import type { JobRepository, JobWithStages } from "../../src/modules/jobs/job.repository.ts";

const RECRUITER_ID = "recruiter-1";
const JOB_ID = "job-1";

function buildJob(overrides: Partial<JobWithStages> = {}): JobWithStages {
  return {
    id: JOB_ID,
    recruiterId: RECRUITER_ID,
    title: "Backend Engineer",
    description: "x",
    requirements: "x",
    status: JobStatus.PUBLISHED,
    embedding: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    stages: [
      { id: "stage-1", jobId: JOB_ID, name: "Applied", order: 1, isTerminal: false, createdAt: new Date() },
      { id: "stage-2", jobId: JOB_ID, name: "Hired", order: 2, isTerminal: true, createdAt: new Date() },
    ],
    ...overrides,
  };
}

function fakeDashboardRepository(overrides: Partial<DashboardRepository> = {}): DashboardRepository {
  return {
    countOpenJobs: async () => 3,
    countTotalApplications: async () => 10,
    applicationsByStage: async () => [
      { stageId: "stage-1", stageName: "Applied", isTerminal: false, count: 7 },
      { stageId: "stage-2", stageName: "Hired", isTerminal: true, count: 3 },
    ],
    interviewCountsByStatus: async () => ({
      [InterviewStatus.SCHEDULED]: 2,
      [InterviewStatus.RESCHEDULED]: 0,
      [InterviewStatus.CANCELLED]: 1,
      [InterviewStatus.COMPLETED]: 4,
    }),
    countActiveApplications: async () => 7,
    countTerminalApplications: async () => 3,
    countStaleApplications: async () => 2,
    averageTimeToHireDays: async () => 5.5,
    ...overrides,
  } as DashboardRepository;
}

function fakeJobRepository(overrides: Partial<JobRepository> = {}): JobRepository {
  return { findById: async () => buildJob(), ...overrides } as JobRepository;
}

describe("DashboardService.getOverview", () => {
  test("assembles metrics from the repository", async () => {
    const service = new DashboardService(fakeDashboardRepository(), fakeJobRepository());

    const overview = await service.getOverview(RECRUITER_ID);

    expect(overview.openJobs).toBe(3);
    expect(overview.totalApplications).toBe(10);
    expect(overview.pipelineHealth).toEqual({ activeApplications: 7, terminalApplications: 3, staleApplications: 2 });
    expect(overview.timeToHireDays).toBe(5.5);
    expect(overview.interviewCounts[InterviewStatus.COMPLETED]).toBe(4);
  });

  test("reports null time-to-hire when nobody has been hired yet", async () => {
    const service = new DashboardService(
      fakeDashboardRepository({ averageTimeToHireDays: async () => null }),
      fakeJobRepository(),
    );

    const overview = await service.getOverview(RECRUITER_ID);

    expect(overview.timeToHireDays).toBeNull();
  });
});

describe("DashboardService.getJobPipeline", () => {
  test("rejects a recruiter who doesn't own the job", async () => {
    const service = new DashboardService(
      fakeDashboardRepository(),
      fakeJobRepository({ findById: async () => buildJob({ recruiterId: "someone-else" }) }),
    );

    await expect(service.getJobPipeline(RECRUITER_ID, JOB_ID)).rejects.toThrow("Job not found");
  });

  test("returns every stage in order, including ones with zero applications", async () => {
    const service = new DashboardService(
      fakeDashboardRepository({
        applicationsByStage: async () => [{ stageId: "stage-1", stageName: "Applied", isTerminal: false, count: 5 }],
      }),
      fakeJobRepository(),
    );

    const pipeline = await service.getJobPipeline(RECRUITER_ID, JOB_ID);

    expect(pipeline.stages.map((stage) => stage.stageName)).toEqual(["Applied", "Hired"]);
    expect(pipeline.stages[0]?.applicationCount).toBe(5);
    expect(pipeline.stages[1]?.applicationCount).toBe(0);
    expect(pipeline.totalApplications).toBe(5);
  });
});
