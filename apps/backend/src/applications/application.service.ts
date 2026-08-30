import { JobStatus, Role } from "@atcon/database";
import type { AuthenticatedUser } from "../auth/types.ts";
import { CandidateRepository } from "../candidates/candidate.repository.ts";
import { ResumeRepository } from "../candidates/resume.repository.ts";
import { JobRepository } from "../jobs/job.repository.ts";
import { BadRequestError, ConflictError, NotFoundError } from "../shared/http/HttpError.ts";
import { isUniqueConstraintViolation } from "../shared/prismaErrors.ts";
import { ApplicationRepository, type ApplicationWithRelations } from "./application.repository.ts";
import type { CreateApplicationRequestBody } from "./dto.ts";

export class ApplicationService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly jobRepository: JobRepository,
    private readonly candidateRepository: CandidateRepository,
    private readonly resumeRepository: ResumeRepository,
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

    try {
      return await this.applicationRepository.create({
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
