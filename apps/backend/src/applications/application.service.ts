import { JobStatus, Role } from "@atcon/database";
import type { Queue } from "bullmq";
import type { AuthenticatedUser } from "../auth/types.ts";
import { CandidateRepository } from "../candidates/candidate.repository.ts";
import { ResumeRepository } from "../candidates/resume.repository.ts";
import { JobRepository } from "../jobs/job.repository.ts";
import type { ApplicationRankJobData } from "../queue/jobs.ts";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../shared/http/HttpError.ts";
import { logger } from "../shared/logger.ts";
import { isUniqueConstraintViolation } from "../shared/prismaErrors.ts";
import { ApplicationRepository, type ApplicationWithRelations } from "./application.repository.ts";
import type { CreateApplicationRequestBody, MoveApplicationStageRequestBody } from "./dto.ts";
import { assertValidStageTransition } from "./pipeline.ts";

export class ApplicationService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly jobRepository: JobRepository,
    private readonly candidateRepository: CandidateRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly applicationRankQueue: Queue<ApplicationRankJobData>,
  ) {}

  async applyToJob(
    userId: string,
    jobId: string,
    input: CreateApplicationRequestBody,
  ): Promise<ApplicationWithRelations> {
    const candidate = await this.candidateRepository.findByUserId(userId);
    if (!candidate) {
      throw new NotFoundError("Candidate profile not found");
    }

    const job = await this.jobRepository.findById(jobId);
    if (!job || job.status !== JobStatus.PUBLISHED) {
      throw new NotFoundError("Job not found");
    }

    if (typeof input.resumeId !== "string" || input.resumeId.trim().length === 0) {
      throw new BadRequestError("resumeId is required to apply");
    }
    const resumes = await this.resumeRepository.findByCandidateId(candidate.id);
    const resume = resumes.find((candidateResume) => candidateResume.id === input.resumeId);
    if (!resume) {
      throw new BadRequestError("resumeId must reference one of your own uploaded resumes");
    }

    const alreadyApplied = await this.applicationRepository.existsForCandidateAndJob(candidate.id, jobId);
    if (alreadyApplied) {
      throw new ConflictError("You have already applied to this job");
    }

    const firstStage = [...job.stages].sort((a, b) => a.order - b.order)[0];
    if (!firstStage) {
      throw new ConflictError("This job has no pipeline stages configured");
    }

    let application: ApplicationWithRelations;
    try {
      application = await this.applicationRepository.create({
        candidateId: candidate.id,
        jobId,
        currentStageId: firstStage.id,
        resumeId: resume.id,
        changedById: userId,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error, "candidateId")) {
        throw new ConflictError("You have already applied to this job");
      }
      throw error;
    }

    // The application already exists — ranking is derived data, so a queue
    // outage shouldn't undo a successful application.
    try {
      await this.applicationRankQueue.add("rank", { applicationId: application.id });
    } catch (error) {
      logger.warn("Failed to enqueue application.rank job", {
        applicationId: application.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return application;
  }

  async getApplicationForViewer(applicationId: string, viewer: AuthenticatedUser): Promise<ApplicationWithRelations> {
    const application = await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundError("Application not found");
    }
    await this.assertCanView(application, viewer);
    return application;
  }

  async listApplicationsForViewer(viewer: AuthenticatedUser, jobIdFilter?: string): Promise<ApplicationWithRelations[]> {
    if (viewer.role === Role.RECRUITER) {
      if (jobIdFilter) {
        const job = await this.jobRepository.findById(jobIdFilter);
        if (!job || job.recruiterId !== viewer.id) {
          throw new NotFoundError("Job not found");
        }
      }
      return this.applicationRepository.findByRecruiter(viewer.id, jobIdFilter);
    }

    const candidate = await this.candidateRepository.findByUserId(viewer.id);
    if (!candidate) {
      throw new NotFoundError("Candidate profile not found");
    }
    return this.applicationRepository.findByCandidateId(candidate.id);
  }

  async moveApplicationToStage(
    recruiterId: string,
    applicationId: string,
    input: MoveApplicationStageRequestBody,
  ): Promise<ApplicationWithRelations> {
    if (typeof input.stageId !== "string" || input.stageId.trim().length === 0) {
      throw new BadRequestError("stageId is required");
    }
    const reason = typeof input.reason === "string" && input.reason.trim().length > 0 ? input.reason.trim() : undefined;

    const application = await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundError("Application not found");
    }
    if (application.job.recruiterId !== recruiterId) {
      throw new ForbiddenError("You do not own the job this application belongs to");
    }

    const job = await this.jobRepository.findById(application.jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }
    const targetStage = job.stages.find((stage) => stage.id === input.stageId);
    if (!targetStage) {
      throw new BadRequestError("stageId must be a stage on this application's job");
    }

    assertValidStageTransition(application.currentStage, targetStage);

    return this.applicationRepository.moveToStage({
      applicationId,
      fromStageId: application.currentStage.id,
      toStageId: targetStage.id,
      changedById: recruiterId,
      reason,
    });
  }

  private async assertCanView(application: ApplicationWithRelations, viewer: AuthenticatedUser): Promise<void> {
    if (viewer.role === Role.RECRUITER) {
      if (application.job.recruiterId !== viewer.id) {
        throw new NotFoundError("Application not found");
      }
      return;
    }

    const candidate = await this.candidateRepository.findByUserId(viewer.id);
    if (!candidate || application.candidateId !== candidate.id) {
      throw new NotFoundError("Application not found");
    }
  }
}
