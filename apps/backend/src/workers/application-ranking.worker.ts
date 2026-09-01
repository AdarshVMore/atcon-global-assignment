import { ResumeStatus, type Prisma } from "@atcon/database";
import type { Job, Worker } from "bullmq";
import { ApplicationRepository } from "../modules/applications/application.repository.ts";
import { ResumeRepository } from "../modules/resumes/resume.repository.ts";
import { config } from "../config/env.ts";
import { JobRepository } from "../modules/jobs/job.repository.ts";
import { createOpenRouterClient } from "../infrastructure/llm/openRouterClient.ts";
import { createWorker } from "../queues/queue.service.ts";
import { APPLICATION_RANK_QUEUE_NAME, type ApplicationRankJobData } from "../queues/ranking.queue.ts";
import { CandidateJobMatcher } from "../modules/ranking/candidateJobMatcher.ts";
import { computeDeterministicScore } from "../modules/ranking/deterministicScore.ts";
import { cosineSimilarity } from "../modules/ranking/cosineSimilarity.ts";
import { EmbeddingClient } from "../modules/ranking/embeddingClient.ts";
import { logger } from "../shared/utils/logger.ts";

interface StoredResumeParseData {
  rawText?: string;
  structured?: { skills?: string[] } | null;
}

// Keyword overlap is a coarse baseline; semantic embedding similarity is the
// stronger signal when it's available, so it carries the larger weight.
const DETERMINISTIC_WEIGHT = 0.4;
const EMBEDDING_WEIGHT = 0.6;

export function createApplicationRankProcessor(
  applicationRepository: ApplicationRepository,
  jobRepository: JobRepository,
  resumeRepository: ResumeRepository,
  embeddingClient: EmbeddingClient | null,
  matcher: CandidateJobMatcher | null,
) {
  return async function processApplicationRankJob(job: Job<ApplicationRankJobData>): Promise<void> {
    const application = await applicationRepository.findById(job.data.applicationId);
    if (!application || application.rankedAt) {
      // Deleted, or already ranked by an earlier delivery of this same job.
      return;
    }

    let jobRecord = await jobRepository.findById(application.jobId);
    if (!jobRecord) {
      return;
    }

    const resume = application.resumeId ? await resumeRepository.findById(application.resumeId) : null;
    if (resume && resume.status !== ResumeStatus.PARSED && resume.status !== ResumeStatus.FAILED) {
      // resume.parse and application.rank are independent queues with no
      // ordering guarantee — retry until parsing has actually finished
      // rather than ranking against an empty resume.
      throw new Error(`Resume ${resume.id} is still ${resume.status}; retrying once parsing finishes`);
    }

    const parsedData = resume?.parsedData as StoredResumeParseData | null;
    const candidateText = parsedData?.rawText ?? "";
    const candidateSkills = parsedData?.structured?.skills ?? [];

    const jobText = [jobRecord.title, jobRecord.description, jobRecord.requirements].join("\n\n");
    const deterministic = computeDeterministicScore(jobText, candidateSkills, candidateText);

    let embeddingSimilarity: number | null = null;
    if (embeddingClient && resume && candidateText) {
      if (jobRecord.embedding.length === 0) {
        const jobEmbedding = await embeddingClient.embed(jobText);
        jobRecord = await jobRepository.updateEmbedding(jobRecord.id, jobEmbedding);
      }

      let resumeEmbedding = resume.embedding;
      if (resumeEmbedding.length === 0) {
        resumeEmbedding = await embeddingClient.embed(candidateText);
        await resumeRepository.updateEmbedding(resume.id, resumeEmbedding);
      }

      embeddingSimilarity = Math.round(cosineSimilarity(jobRecord.embedding, resumeEmbedding) * 100);
    }

    const finalScore =
      embeddingSimilarity === null
        ? deterministic.score
        : Math.round(DETERMINISTIC_WEIGHT * deterministic.score + EMBEDDING_WEIGHT * embeddingSimilarity);

    // The LLM only supplies a human-readable rationale here, not the score
    // itself — a rationale is a nice-to-have, so a failure degrades
    // gracefully instead of blocking a ranking that's otherwise complete.
    let llmReasoning: string | null = null;
    if (matcher) {
      try {
        const llmResult = await matcher.score(
          { title: jobRecord.title, description: jobRecord.description, requirements: jobRecord.requirements },
          candidateText || candidateSkills.join(", "),
        );
        llmReasoning = llmResult.reasoning;
      } catch (error) {
        logger.warn("LLM ranking rationale failed; keeping the deterministic/embedding score", {
          applicationId: application.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await applicationRepository.updateRanking(application.id, {
      score: finalScore,
      explanation: {
        method: embeddingSimilarity === null ? "deterministic" : "deterministic+embedding",
        deterministic,
        embeddingSimilarity,
        llmReasoning,
      } as unknown as Prisma.InputJsonValue,
    });
  };
}

export function startApplicationRankWorker(): Worker<ApplicationRankJobData> {
  const applicationRepository = new ApplicationRepository();
  const jobRepository = new JobRepository();
  const resumeRepository = new ResumeRepository();
  const embeddingClient = config.openRouterApiKey ? new EmbeddingClient(createOpenRouterClient()) : null;
  const matcher = config.openRouterApiKey ? new CandidateJobMatcher(createOpenRouterClient()) : null;

  return createWorker<ApplicationRankJobData>(
    APPLICATION_RANK_QUEUE_NAME,
    createApplicationRankProcessor(applicationRepository, jobRepository, resumeRepository, embeddingClient, matcher),
  );
}
