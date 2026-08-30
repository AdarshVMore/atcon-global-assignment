import type { Prisma } from "@atcon/database";
import type { Job, Worker } from "bullmq";
import { ApplicationRepository } from "../applications/application.repository.ts";
import { ResumeRepository } from "../candidates/resume.repository.ts";
import { config } from "../config/env.ts";
import { JobRepository } from "../jobs/job.repository.ts";
import { createWorker } from "../queue/createWorker.ts";
import type { ApplicationRankJobData } from "../queue/jobs.ts";
import { QUEUE_NAMES } from "../queue/queueNames.ts";
import { CandidateJobMatcher, type LlmRankingResult } from "../ranking/candidateJobMatcher.ts";
import { computeDeterministicScore } from "../ranking/deterministicScore.ts";
import { createOpenRouterClient } from "../shared/llm/openRouterClient.ts";

interface StoredResumeParseData {
  rawText?: string;
  structured?: { skills?: string[] } | null;
}

export function createApplicationRankProcessor(
  applicationRepository: ApplicationRepository,
  jobRepository: JobRepository,
  resumeRepository: ResumeRepository,
  matcher: CandidateJobMatcher | null,
) {
  return async function processApplicationRankJob(job: Job<ApplicationRankJobData>): Promise<void> {
    const application = await applicationRepository.findById(job.data.applicationId);
    if (!application || application.rankedAt) {
      // Deleted, or already ranked by an earlier delivery of this same job.
      return;
    }

    const jobRecord = await jobRepository.findById(application.jobId);
    if (!jobRecord) {
      return;
    }

    const resume = application.resumeId ? await resumeRepository.findById(application.resumeId) : null;
    const parsedData = resume?.parsedData as StoredResumeParseData | null;
    const candidateText = parsedData?.rawText ?? "";
    const candidateSkills = parsedData?.structured?.skills ?? [];

    const jobText = [jobRecord.title, jobRecord.description, jobRecord.requirements].join("\n\n");
    const deterministic = computeDeterministicScore(jobText, candidateSkills, candidateText);

    let finalScore = deterministic.score;
    let llm: LlmRankingResult | null = null;
    if (matcher) {
      llm = await matcher.score(
        { title: jobRecord.title, description: jobRecord.description, requirements: jobRecord.requirements },
        candidateText || candidateSkills.join(", "),
      );
      finalScore = llm.score;
    }

    await applicationRepository.updateRanking(application.id, {
      score: finalScore,
      explanation: { method: llm ? "llm" : "deterministic", deterministic, llm } as unknown as Prisma.InputJsonValue,
    });
  };
}

export function startApplicationRankWorker(): Worker<ApplicationRankJobData> {
  const applicationRepository = new ApplicationRepository();
  const jobRepository = new JobRepository();
  const resumeRepository = new ResumeRepository();
  const matcher = config.openRouterApiKey ? new CandidateJobMatcher(createOpenRouterClient()) : null;

  return createWorker<ApplicationRankJobData>(
    QUEUE_NAMES.APPLICATION_RANK,
    createApplicationRankProcessor(applicationRepository, jobRepository, resumeRepository, matcher),
  );
}
