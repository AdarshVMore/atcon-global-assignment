import { describe, expect, test } from "bun:test";
import { JobStatus, Role, type Job, type JobStage, type Resume } from "@atcon/database";
import { ApplicationService } from "./application.service.ts";
import type { ApplicationRepository, ApplicationWithRelations } from "./application.repository.ts";
import type { CandidateRepository, CandidateWithUser } from "../candidates/candidate.repository.ts";
import type { ResumeRepository } from "../candidates/resume.repository.ts";
import type { JobRepository, JobWithStages } from "../jobs/job.repository.ts";

const CANDIDATE_USER_ID = "user-candidate-1";
const CANDIDATE_ID = "candidate-1";
const RECRUITER_ID = "recruiter-1";
const OTHER_RECRUITER_ID = "recruiter-2";
const JOB_ID = "job-1";
const RESUME_ID = "resume-1";

function buildStage(overrides: Partial<JobStage> = {}): JobStage {
  return { id: "stage-1", jobId: JOB_ID, name: "Applied", order: 1, isTerminal: false, createdAt: new Date(), ...overrides };
}

function buildJob(overrides: Partial<JobWithStages> = {}): JobWithStages {
  const base: Job = {
    id: JOB_ID,
    recruiterId: RECRUITER_ID,
    title: "Backend Engineer",
    description: "x",
    requirements: "x",
    status: JobStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...base, stages: [buildStage()], ...overrides };
}

function buildCandidate(): CandidateWithUser {
  return {
    id: CANDIDATE_ID,
    userId: CANDIDATE_USER_ID,
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: CANDIDATE_USER_ID,
      email: "candidate@atcon.dev",
      name: "Chris Candidate",
      passwordHash: "",
      role: Role.CANDIDATE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

function buildResume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: RESUME_ID,
    candidateId: CANDIDATE_ID,
    fileUrl: "resumes/candidate-1/resume.pdf",
    originalFileName: "resume.pdf",
    mimeType: "application/pdf",
    fileHash: "hash",
    status: "UPLOADED" as never,
    parsedData: null,
    parseError: null,
    uploadedAt: new Date(),
    parsedAt: null,
    ...overrides,
  };
}

function buildApplication(overrides: Partial<ApplicationWithRelations> = {}): ApplicationWithRelations {
  return {
    id: "application-1",
    candidateId: CANDIDATE_ID,
    jobId: JOB_ID,
    currentStageId: "stage-1",
    resumeId: RESUME_ID,
    appliedAt: new Date(),
    rankingScore: null,
    rankingExplanation: null,
    rankedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    job: { id: JOB_ID, title: "Backend Engineer", recruiterId: RECRUITER_ID, status: JobStatus.PUBLISHED },
    currentStage: buildStage(),
    stageHistory: [],
    ...overrides,
  };
}

function fakeApplicationRepository(overrides: Partial<ApplicationRepository> = {}): ApplicationRepository {
  return {
    create: async () => buildApplication(),
    findById: async () => null,
    findByCandidateId: async () => [],
    findByRecruiter: async () => [],
    existsForCandidateAndJob: async () => false,
    ...overrides,
  } as ApplicationRepository;
}

function fakeJobRepository(overrides: Partial<JobRepository> = {}): JobRepository {
  return {
    create: async () => buildJob(),
    findById: async () => buildJob(),
    findPublished: async () => [],
    findByRecruiter: async () => [],
    update: async () => buildJob(),
    addStage: async () => buildStage(),
    updateStage: async () => buildStage(),
    ...overrides,
  } as JobRepository;
}

function fakeCandidateRepository(overrides: Partial<CandidateRepository> = {}): CandidateRepository {
  return {
    findByUserId: async () => buildCandidate(),
    updatePhone: async () => buildCandidate(),
    ...overrides,
  } as CandidateRepository;
}

function fakeResumeRepository(overrides: Partial<ResumeRepository> = {}): ResumeRepository {
  return {
    create: async () => buildResume(),
    findByCandidateAndHash: async () => null,
    findByCandidateId: async () => [buildResume()],
    ...overrides,
  } as ResumeRepository;
}

function buildService(overrides: {
  applicationRepository?: Partial<ApplicationRepository>;
  jobRepository?: Partial<JobRepository>;
  candidateRepository?: Partial<CandidateRepository>;
  resumeRepository?: Partial<ResumeRepository>;
} = {}) {
  return new ApplicationService(
    fakeApplicationRepository(overrides.applicationRepository),
    fakeJobRepository(overrides.jobRepository),
    fakeCandidateRepository(overrides.candidateRepository),
    fakeResumeRepository(overrides.resumeRepository),
  );
}

describe("ApplicationService.applyToJob", () => {
  test("rejects applying to a job that isn't published", async () => {
    const service = buildService({ jobRepository: { findById: async () => buildJob({ status: JobStatus.DRAFT }) } });

    await expect(service.applyToJob(CANDIDATE_USER_ID, JOB_ID, { resumeId: RESUME_ID })).rejects.toThrow(
      "Job not found",
    );
  });

  test("rejects applying without a resumeId", async () => {
    const service = buildService();

    await expect(service.applyToJob(CANDIDATE_USER_ID, JOB_ID, {})).rejects.toThrow("resumeId is required to apply");
  });

  test("rejects a resumeId that doesn't belong to the candidate", async () => {
    const service = buildService({ resumeRepository: { findByCandidateId: async () => [] } });

    await expect(service.applyToJob(CANDIDATE_USER_ID, JOB_ID, { resumeId: "someone-elses-resume" })).rejects.toThrow(
      "resumeId must reference one of your own uploaded resumes",
    );
  });

  test("rejects a duplicate application to the same job", async () => {
    const service = buildService({ applicationRepository: { existsForCandidateAndJob: async () => true } });

    await expect(service.applyToJob(CANDIDATE_USER_ID, JOB_ID, { resumeId: RESUME_ID })).rejects.toThrow(
      "You have already applied to this job",
    );
  });

  test("creates the application at the job's first stage", async () => {
    let createInput: unknown;
    const service = buildService({
      jobRepository: {
        findById: async () =>
          buildJob({ stages: [buildStage({ id: "stage-2", order: 2 }), buildStage({ id: "stage-1", order: 1 })] }),
      },
      applicationRepository: {
        create: async (input) => {
          createInput = input;
          return buildApplication({ currentStageId: input.currentStageId });
        },
      },
    });

    const application = await service.applyToJob(CANDIDATE_USER_ID, JOB_ID, { resumeId: RESUME_ID });

    expect(application.currentStageId).toBe("stage-1");
    expect((createInput as { currentStageId: string }).currentStageId).toBe("stage-1");
  });
});

describe("ApplicationService.getApplicationForViewer", () => {
  test("lets the owning candidate view their application", async () => {
    const service = buildService({ applicationRepository: { findById: async () => buildApplication() } });

    const result = await service.getApplicationForViewer("application-1", {
      id: CANDIDATE_USER_ID,
      email: "c@atcon.dev",
      role: Role.CANDIDATE,
    });

    expect(result.id).toBe("application-1");
  });

  test("hides the application from a candidate who doesn't own it", async () => {
    const service = buildService({
      applicationRepository: { findById: async () => buildApplication() },
      candidateRepository: { findByUserId: async () => null },
    });

    await expect(
      service.getApplicationForViewer("application-1", { id: "someone-else", email: "x@atcon.dev", role: Role.CANDIDATE }),
    ).rejects.toThrow("Application not found");
  });

  test("lets the owning recruiter view the application", async () => {
    const service = buildService({ applicationRepository: { findById: async () => buildApplication() } });

    const result = await service.getApplicationForViewer("application-1", {
      id: RECRUITER_ID,
      email: "r@atcon.dev",
      role: Role.RECRUITER,
    });

    expect(result.id).toBe("application-1");
  });

  test("hides the application from a recruiter who doesn't own the job", async () => {
    const service = buildService({ applicationRepository: { findById: async () => buildApplication() } });

    await expect(
      service.getApplicationForViewer("application-1", {
        id: OTHER_RECRUITER_ID,
        email: "r2@atcon.dev",
        role: Role.RECRUITER,
      }),
    ).rejects.toThrow("Application not found");
  });
});

describe("ApplicationService.listApplicationsForViewer", () => {
  test("rejects a recruiter filtering by a job they don't own", async () => {
    const service = buildService({ jobRepository: { findById: async () => buildJob({ recruiterId: OTHER_RECRUITER_ID }) } });

    await expect(
      service.listApplicationsForViewer({ id: RECRUITER_ID, email: "r@atcon.dev", role: Role.RECRUITER }, JOB_ID),
    ).rejects.toThrow("Job not found");
  });
});
