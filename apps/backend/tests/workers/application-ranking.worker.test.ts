import { describe, expect, test } from "bun:test";
import { JobStatus, ResumeStatus, type Job as JobModel, type JobStage, type Resume } from "@atcon/database";
import type { Job } from "bullmq";
import { createApplicationRankProcessor } from "../../src/workers/application-ranking.worker.ts";
import type { ApplicationRepository, ApplicationWithRelations, RankingResultInput } from "../../src/modules/applications/application.repository.ts";
import type { CandidateJobMatcher } from "../../src/modules/ranking/candidateJobMatcher.ts";
import type { ResumeRepository } from "../../src/modules/resumes/resume.repository.ts";
import type { JobRepository, JobWithStages } from "../../src/modules/jobs/job.repository.ts";

function buildStage(overrides: Partial<JobStage> = {}): JobStage {
  return { id: "stage-1", jobId: "job-1", name: "Applied", order: 1, isTerminal: false, createdAt: new Date(), ...overrides };
}

function buildJobRecord(overrides: Partial<JobWithStages> = {}): JobWithStages {
  const base: JobModel = {
    id: "job-1",
    recruiterId: "recruiter-1",
    title: "Backend Engineer",
    description: "Build APIs with TypeScript and PostgreSQL",
    requirements: "TypeScript, PostgreSQL",
    status: JobStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...base, stages: [buildStage()], ...overrides };
}

function buildApplication(overrides: Partial<ApplicationWithRelations> = {}): ApplicationWithRelations {
  return {
    id: "application-1",
    candidateId: "candidate-1",
    jobId: "job-1",
    currentStageId: "stage-1",
    resumeId: "resume-1",
    appliedAt: new Date(),
    rankingScore: null,
    rankingExplanation: null,
    rankedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    job: { id: "job-1", title: "Backend Engineer", recruiterId: "recruiter-1", status: JobStatus.PUBLISHED },
    currentStage: buildStage(),
    stageHistory: [],
    ...overrides,
  };
}

function buildResume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: "resume-1",
    candidateId: "candidate-1",
    fileUrl: "resumes/candidate-1/resume.pdf",
    originalFileName: "resume.pdf",
    mimeType: "application/pdf",
    fileHash: "hash",
    status: ResumeStatus.PARSED,
    parsedData: { rawText: "TypeScript and PostgreSQL engineer", structured: { skills: ["TypeScript"] } },
    parseError: null,
    uploadedAt: new Date(),
    parsedAt: new Date(),
    ...overrides,
  };
}

function fakeApplicationRepository(overrides: Partial<ApplicationRepository> = {}): ApplicationRepository & {
  rankingUpdates: RankingResultInput[];
} {
  const rankingUpdates: RankingResultInput[] = [];
  return {
    rankingUpdates,
    findById: async () => buildApplication(),
    updateRanking: async (_id, input) => {
      rankingUpdates.push(input);
      return buildApplication({ rankingScore: input.score, rankingExplanation: input.explanation as never });
    },
    ...overrides,
  } as ApplicationRepository & { rankingUpdates: RankingResultInput[] };
}

function fakeJobRepository(overrides: Partial<JobRepository> = {}): JobRepository {
  return { findById: async () => buildJobRecord(), ...overrides } as JobRepository;
}

function fakeResumeRepository(overrides: Partial<ResumeRepository> = {}): ResumeRepository {
  return { findById: async () => buildResume(), ...overrides } as ResumeRepository;
}

function buildJob(applicationId = "application-1"): Job<{ applicationId: string }> {
  return { data: { applicationId } } as Job<{ applicationId: string }>;
}

describe("applicationRank worker processor", () => {
  test("skips an application that is already ranked (idempotent against redelivery)", async () => {
    const applicationRepository = fakeApplicationRepository({
      findById: async () => buildApplication({ rankedAt: new Date() }),
    });
    const processor = createApplicationRankProcessor(applicationRepository, fakeJobRepository(), fakeResumeRepository(), null);

    await processor(buildJob());

    expect(applicationRepository.rankingUpdates).toEqual([]);
  });

  test("does nothing if the application no longer exists", async () => {
    const applicationRepository = fakeApplicationRepository({ findById: async () => null });
    const processor = createApplicationRankProcessor(applicationRepository, fakeJobRepository(), fakeResumeRepository(), null);

    await processor(buildJob());

    expect(applicationRepository.rankingUpdates).toEqual([]);
  });

  test("without an LLM matcher, ranks deterministically from the parsed resume", async () => {
    const applicationRepository = fakeApplicationRepository();
    const processor = createApplicationRankProcessor(applicationRepository, fakeJobRepository(), fakeResumeRepository(), null);

    await processor(buildJob());

    const update = applicationRepository.rankingUpdates[0];
    expect(update?.score).toBeGreaterThan(0);
    const explanation = update?.explanation as { method: string };
    expect(explanation.method).toBe("deterministic");
  });

  test("uses the LLM score when a matcher is configured", async () => {
    const applicationRepository = fakeApplicationRepository();
    const matcher = { score: async () => ({ score: 91, reasoning: "Great fit" }) } as unknown as CandidateJobMatcher;
    const processor = createApplicationRankProcessor(applicationRepository, fakeJobRepository(), fakeResumeRepository(), matcher);

    await processor(buildJob());

    const update = applicationRepository.rankingUpdates[0];
    expect(update?.score).toBe(91);
    const explanation = update?.explanation as { method: string; llm: { reasoning: string } };
    expect(explanation.method).toBe("llm");
    expect(explanation.llm.reasoning).toBe("Great fit");
  });

  test("handles a resume that hasn't been parsed yet without crashing", async () => {
    const applicationRepository = fakeApplicationRepository();
    const resumeRepository = fakeResumeRepository({
      findById: async () => buildResume({ status: ResumeStatus.UPLOADED, parsedData: null }),
    });
    const processor = createApplicationRankProcessor(applicationRepository, fakeJobRepository(), resumeRepository, null);

    await processor(buildJob());

    expect(applicationRepository.rankingUpdates[0]?.score).toBe(0);
  });

  test("lets an LLM failure propagate so the queue can retry", async () => {
    const matcher = {
      score: async () => {
        throw new Error("OpenRouter timed out");
      },
    } as unknown as CandidateJobMatcher;
    const processor = createApplicationRankProcessor(
      fakeApplicationRepository(),
      fakeJobRepository(),
      fakeResumeRepository(),
      matcher,
    );

    await expect(processor(buildJob())).rejects.toThrow("OpenRouter timed out");
  });
});
