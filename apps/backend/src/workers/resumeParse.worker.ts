import { ResumeStatus, type Prisma } from "@atcon/database";
import { UnrecoverableError, type Job, type Worker } from "bullmq";
import { extractResumeText, UnsupportedResumeFormatError } from "../candidates/resumeTextExtraction.ts";
import { CandidateRepository } from "../candidates/candidate.repository.ts";
import { ResumeInformationExtractor, type ParsedResumeData } from "../candidates/resumeInformationExtractor.ts";
import { ResumeRepository } from "../candidates/resume.repository.ts";
import { config } from "../config/env.ts";
import { createWorker } from "../queue/createWorker.ts";
import type { ResumeParseJobData } from "../queue/jobs.ts";
import { QUEUE_NAMES } from "../queue/queueNames.ts";
import { createOpenRouterClient } from "../shared/llm/openRouterClient.ts";
import { logger } from "../shared/logger.ts";
import { ResumeStorage } from "../shared/storage/resumeStorage.ts";

interface StoredResumeParseResult {
  [key: string]: unknown;
  rawText: string;
  structured: ParsedResumeData | null;
}

async function backfillCandidatePhone(
  candidateRepository: CandidateRepository,
  candidateId: string,
  phone: string,
): Promise<void> {
  const candidate = await candidateRepository.findById(candidateId);
  if (!candidate || candidate.phone) {
    return;
  }

  try {
    await candidateRepository.updatePhone(candidate.id, phone);
  } catch (error) {
    // Most likely the extracted number collides with another candidate's
    // phone (unique constraint) — a convenience backfill isn't worth
    // failing the whole parse job over.
    logger.warn("Could not backfill candidate phone from parsed resume", {
      candidateId: candidate.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function createResumeParseProcessor(
  resumeRepository: ResumeRepository,
  candidateRepository: CandidateRepository,
  resumeStorage: ResumeStorage,
  extractor: ResumeInformationExtractor | null,
) {
  return async function processResumeParseJob(job: Job<ResumeParseJobData>): Promise<void> {
    const resume = await resumeRepository.findById(job.data.resumeId);
    if (!resume || resume.status === ResumeStatus.PARSED) {
      // Deleted, or already finished by an earlier delivery of this same job.
      return;
    }

    await resumeRepository.updateStatus(resume.id, { status: ResumeStatus.PROCESSING });

    const fileBytes = await resumeStorage.download(resume.fileUrl);
    let rawText: string;
    try {
      rawText = await extractResumeText(resume.mimeType, fileBytes);
    } catch (error) {
      // An unsupported file format will never succeed on retry — fail it
      // immediately instead of burning through the queue's retry attempts.
      if (error instanceof UnsupportedResumeFormatError) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }

    if (!extractor) {
      const result: StoredResumeParseResult = { rawText, structured: null };
      await resumeRepository.updateStatus(resume.id, {
        status: ResumeStatus.PARSED,
        parsedAt: new Date(),
        parsedData: result as Prisma.InputJsonValue,
      });
      return;
    }

    const structured = await extractor.extract(rawText);
    const result: StoredResumeParseResult = { rawText, structured };
    await resumeRepository.updateStatus(resume.id, {
      status: ResumeStatus.PARSED,
      parsedAt: new Date(),
      parsedData: result as Prisma.InputJsonValue,
    });

    if (structured.phone) {
      await backfillCandidatePhone(candidateRepository, resume.candidateId, structured.phone);
    }
  };
}

export function startResumeParseWorker(): Worker<ResumeParseJobData> {
  const resumeRepository = new ResumeRepository();
  const candidateRepository = new CandidateRepository();
  const resumeStorage = new ResumeStorage();
  const extractor = config.openRouterApiKey ? new ResumeInformationExtractor(createOpenRouterClient()) : null;

  return createWorker<ResumeParseJobData>(
    QUEUE_NAMES.RESUME_PARSE,
    createResumeParseProcessor(resumeRepository, candidateRepository, resumeStorage, extractor),
    {
      onFinalFailure: async (job, error) => {
        if (!job) {
          return;
        }
        await resumeRepository
          .updateStatus(job.data.resumeId, { status: ResumeStatus.FAILED, parseError: error.message })
          .catch(() => {});
      },
    },
  );
}
