import type { Resume } from "@atcon/database";
import type { Queue } from "bullmq";
import type { ResumeParseJobData } from "../../queues/resume.queue.ts";
import { ConflictError, NotFoundError } from "../../shared/errors/HttpError.ts";
import { logger } from "../../shared/utils/logger.ts";
import { isUniqueConstraintViolation } from "../../shared/utils/prismaErrors.ts";
import type { ResumeStorage } from "../../infrastructure/storage/resumeStorage.ts";
import { CandidateRepository } from "../candidates/candidate.repository.ts";
import { ResumeRepository } from "./resume.repository.ts";
import { assertValidResumeFile, type IncomingResumeFile } from "./resume.validation.ts";

export class ResumeService {
  constructor(
    private readonly resumeRepository: ResumeRepository,
    private readonly candidateRepository: CandidateRepository,
    private readonly resumeStorage: ResumeStorage,
    private readonly resumeParseQueue: Queue<ResumeParseJobData>,
  ) {}

  async uploadResume(userId: string, file: IncomingResumeFile): Promise<Resume> {
    const candidate = await this.candidateRepository.findByUserId(userId);
    if (!candidate) {
      throw new NotFoundError("Candidate profile not found");
    }

    assertValidResumeFile(file);

    const hash = this.resumeStorage.hash(file.data);
    const existing = await this.resumeRepository.findByCandidateAndHash(candidate.id, hash);
    if (existing) {
      throw new ConflictError("You have already uploaded this exact resume file");
    }

    const key = this.resumeStorage.buildKey(candidate.id, file.name);
    await this.resumeStorage.upload(key, file.data, file.type);

    let resume: Resume;
    try {
      resume = await this.resumeRepository.create({
        candidateId: candidate.id,
        fileUrl: key,
        originalFileName: file.name,
        mimeType: file.type,
        fileHash: hash,
      });
    } catch (error) {
      await this.resumeStorage.delete(key).catch(() => {});
      if (isUniqueConstraintViolation(error, "fileHash")) {
        throw new ConflictError("You have already uploaded this exact resume file");
      }
      throw error;
    }

    // The resume is already durably stored — a queue outage shouldn't fail
    // the upload itself, just delay parsing.
    try {
      await this.resumeParseQueue.add("parse", { resumeId: resume.id });
    } catch (error) {
      logger.warn("Failed to enqueue resume.parse job", {
        resumeId: resume.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return resume;
  }

  async listResumes(userId: string): Promise<Resume[]> {
    const candidate = await this.candidateRepository.findByUserId(userId);
    if (!candidate) {
      throw new NotFoundError("Candidate profile not found");
    }
    return this.resumeRepository.findByCandidateId(candidate.id);
  }
}
