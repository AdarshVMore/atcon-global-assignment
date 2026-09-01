import { describe, expect, test } from "bun:test";
import { JobStatus, ResumeStatus, type Job as JobModel, type JobStage, type Resume } from "@atcon/database";
import type { Job } from "bullmq";
import { createApplicationRankProcessor } from "../../src/workers/application-ranking.worker.ts";
import type { ApplicationRepository, ApplicationWithRelations, RankingResultInput } from "../../src/modules/applications/application.repository.ts";
import type { CandidateJobMatcher } from "../../src/modules/ranking/candidateJobMatcher.ts";
import type { EmbeddingClient } from "../../src/modules/ranking/embeddingClient.ts";
import { computeDeterministicScore } from "../../src/modules/ranking/deterministicScore.ts";
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
    embedding: [],
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
    embedding: [],
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

function fakeJobRepository(overrides: Partial<JobRepository> = {}): JobRepository & {
  embeddingUpdates: number[][];
} {
  const embeddingUpdates: number[][] = [];
  return {
    embeddingUpdates,
    findById: async () => buildJobRecord(),
    updateEmbedding: async (_id, embedding) => {
      embeddingUpdates.push(embedding);
      return buildJobRecord({ embedding });
    },
    ...overrides,
  } as JobRepository & { embeddingUpdates: number[][] };
}

function fakeResumeRepository(overrides: Partial<ResumeRepository> = {}): ResumeRepository & {
  embeddingUpdates: number[][];
} {
  const embeddingUpdates: number[][] = [];
  return {
    embeddingUpdates,
    findById: async () => buildResume(),
    updateEmbedding: async (_id, embedding) => {
      embeddingUpdates.push(embedding);
      return buildResume({ embedding });
    },
    ...overrides,
  } as ResumeRepository & { embeddingUpdates: number[][] };
}

function fakeEmbeddingClient(embed: (text: string) => Promise<number[]>): EmbeddingClient {
  return { embed } as unknown as EmbeddingClient;
}

function buildJob(applicationId = "application-1"): Job<{ applicationId: string }> {
  return { data: { applicationId } } as Job<{ applicationId: string }>;
}

const JOB_TEXT = ["Backend Engineer", "Build APIs with TypeScript and PostgreSQL", "TypeScript, PostgreSQL"].join("\n\n");
const EXPECTED_DETERMINISTIC = computeDeterministicScore(
  JOB_TEXT,
  ["TypeScript"],
  "TypeScript and PostgreSQL engineer",
);

describe("applicationRank worker processor", () => {
  test("skips an application that is already ranked (idempotent against redelivery)", async () => {
    const applicationRepository = fakeApplicationRepository({
      findById: async () => buildApplication({ rankedAt: new Date() }),
    });
    const processor = createApplicationRankProcessor(
      applicationRepository,
      fakeJobRepository(),
      fakeResumeRepository(),
      null,
      null,
    );

    await processor(buildJob());

    expect(applicationRepository.rankingUpdates).toEqual([]);
  });

  test("does nothing if the application no longer exists", async () => {
    const applicationRepository = fakeApplicationRepository({ findById: async () => null });
    const processor = createApplicationRankProcessor(
      applicationRepository,
      fakeJobRepository(),
      fakeResumeRepository(),
      null,
      null,
    );

    await processor(buildJob());

    expect(applicationRepository.rankingUpdates).toEqual([]);
  });

  test("without an embedding client or LLM, ranks deterministically from the parsed resume", async () => {
    const applicationRepository = fakeApplicationRepository();
    const processor = createApplicationRankProcessor(
      applicationRepository,
      fakeJobRepository(),
      fakeResumeRepository(),
      null,
      null,
    );

    await processor(buildJob());

    const update = applicationRepository.rankingUpdates[0];
    expect(update?.score).toBe(EXPECTED_DETERMINISTIC.score);
    const explanation = update?.explanation as { method: string; embeddingSimilarity: number | null };
    expect(explanation.method).toBe("deterministic");
    expect(explanation.embeddingSimilarity).toBeNull();
  });

  test("blends deterministic and embedding similarity, and caches both embeddings", async () => {
    const applicationRepository = fakeApplicationRepository();
    const jobRepository = fakeJobRepository();
    const resumeRepository = fakeResumeRepository();
    // Identical vectors → cosine similarity 1.0 → embeddingSimilarity 100.
    const embeddingClient = fakeEmbeddingClient(async () => [1, 0]);
    const processor = createApplicationRankProcessor(
      applicationRepository,
      jobRepository,
      resumeRepository,
      embeddingClient,
      null,
    );

    await processor(buildJob());

    const update = applicationRepository.rankingUpdates[0];
    const explanation = update?.explanation as { method: string; embeddingSimilarity: number | null };
    expect(explanation.method).toBe("deterministic+embedding");
    expect(explanation.embeddingSimilarity).toBe(100);
    expect(update?.score).toBe(Math.round(0.4 * EXPECTED_DETERMINISTIC.score + 0.6 * 100));
    expect(jobRepository.embeddingUpdates).toEqual([[1, 0]]);
    expect(resumeRepository.embeddingUpdates).toEqual([[1, 0]]);
  });

  test("reuses cached embeddings instead of recomputing them", async () => {
    const applicationRepository = fakeApplicationRepository();
    const jobRepository = fakeJobRepository({ findById: async () => buildJobRecord({ embedding: [1, 0] }) });
    const resumeRepository = fakeResumeRepository({ findById: async () => buildResume({ embedding: [1, 0] }) });
    let embedCalls = 0;
    const embeddingClient = fakeEmbeddingClient(async () => {
      embedCalls += 1;
      return [1, 0];
    });
    const processor = createApplicationRankProcessor(
      applicationRepository,
      jobRepository,
      resumeRepository,
      embeddingClient,
      null,
    );

    await processor(buildJob());

    expect(embedCalls).toBe(0);
    expect(jobRepository.embeddingUpdates).toEqual([]);
    expect(resumeRepository.embeddingUpdates).toEqual([]);
  });

  test("attaches the LLM's reasoning without letting it override the blended score", async () => {
    const applicationRepository = fakeApplicationRepository();
    const embeddingClient = fakeEmbeddingClient(async () => [1, 0]);
    const matcher = { score: async () => ({ score: 91, reasoning: "Great fit" }) } as unknown as CandidateJobMatcher;
    const processor = createApplicationRankProcessor(
      applicationRepository,
      fakeJobRepository(),
      fakeResumeRepository(),
      embeddingClient,
      matcher,
    );

    await processor(buildJob());

    const update = applicationRepository.rankingUpdates[0];
    expect(update?.score).toBe(Math.round(0.4 * EXPECTED_DETERMINISTIC.score + 0.6 * 100));
    expect(update?.score).not.toBe(91);
    const explanation = update?.explanation as { llmReasoning: string | null };
    expect(explanation.llmReasoning).toBe("Great fit");
  });

  test("keeps the deterministic/embedding score when the LLM reasoning call fails", async () => {
    const applicationRepository = fakeApplicationRepository();
    const matcher = {
      score: async () => {
        throw new Error("OpenRouter timed out");
      },
    } as unknown as CandidateJobMatcher;
    const processor = createApplicationRankProcessor(
      applicationRepository,
      fakeJobRepository(),
      fakeResumeRepository(),
      null,
      matcher,
    );

    await processor(buildJob());

    const update = applicationRepository.rankingUpdates[0];
    expect(update?.score).toBe(EXPECTED_DETERMINISTIC.score);
    const explanation = update?.explanation as { llmReasoning: string | null };
    expect(explanation.llmReasoning).toBeNull();
  });

  test("retries instead of ranking a resume that hasn't finished parsing yet", async () => {
    const applicationRepository = fakeApplicationRepository();
    const resumeRepository = fakeResumeRepository({
      findById: async () => buildResume({ status: ResumeStatus.UPLOADED, parsedData: null }),
    });
    const processor = createApplicationRankProcessor(
      applicationRepository,
      fakeJobRepository(),
      resumeRepository,
      null,
      null,
    );

    await expect(processor(buildJob())).rejects.toThrow(/still UPLOADED/);
    expect(applicationRepository.rankingUpdates).toEqual([]);
  });

  test("retries while the resume is still processing", async () => {
    const applicationRepository = fakeApplicationRepository();
    const resumeRepository = fakeResumeRepository({
      findById: async () => buildResume({ status: ResumeStatus.PROCESSING, parsedData: null }),
    });
    const processor = createApplicationRankProcessor(
      applicationRepository,
      fakeJobRepository(),
      resumeRepository,
      null,
      null,
    );

    await expect(processor(buildJob())).rejects.toThrow(/still PROCESSING/);
    expect(applicationRepository.rankingUpdates).toEqual([]);
  });

  test("ranks with whatever's available when the resume permanently failed to parse", async () => {
    const applicationRepository = fakeApplicationRepository();
    const resumeRepository = fakeResumeRepository({
      findById: async () => buildResume({ status: ResumeStatus.FAILED, parsedData: null }),
    });
    const embeddingClient = fakeEmbeddingClient(async () => [1, 0]);
    const processor = createApplicationRankProcessor(
      applicationRepository,
      fakeJobRepository(),
      resumeRepository,
      embeddingClient,
      null,
    );

    await processor(buildJob());

    // No parsed text to embed — falls back to the deterministic-only score
    // rather than embedding an empty string.
    expect(applicationRepository.rankingUpdates[0]?.score).toBe(0);
  });
});
