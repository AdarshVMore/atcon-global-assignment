import { JobStatus, Role, type Job } from "@atcon/database";
import type { AuthenticatedUser } from "../auth/types.ts";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../shared/http/HttpError.ts";
import { DEFAULT_JOB_STAGES } from "./defaultStages.ts";
import type {
  AddJobStageRequestBody,
  CreateJobRequestBody,
  UpdateJobRequestBody,
  UpdateJobStageRequestBody,
} from "./dto.ts";
import { JobRepository, type JobWithStages } from "./job.repository.ts";
import { assertValidDescription, assertValidRequirements, assertValidStageName, assertValidTitle } from "./validation.ts";

interface ParsedStageInput {
  name: string;
  isTerminal: boolean;
}

function parseStageInputs(stages: unknown): ParsedStageInput[] {
  if (stages === undefined) {
    return DEFAULT_JOB_STAGES.map((stage) => ({ name: stage.name, isTerminal: stage.isTerminal }));
  }

  if (!Array.isArray(stages) || stages.length === 0) {
    throw new BadRequestError("Stages must be a non-empty array when provided");
  }

  const parsed = stages.map((stage): ParsedStageInput => {
    if (typeof stage !== "object" || stage === null) {
      throw new BadRequestError("Each stage must be an object with a name");
    }
    const name = (stage as Record<string, unknown>).name;
    assertValidStageName(name);
    return { name: name.trim(), isTerminal: (stage as Record<string, unknown>).isTerminal === true };
  });

  const uniqueNames = new Set(parsed.map((stage) => stage.name.toLowerCase()));
  if (uniqueNames.size !== parsed.length) {
    throw new BadRequestError("Stage names must be unique within a job");
  }

  return parsed;
}

function assertOwnsJob(job: Job, recruiterId: string): void {
  if (job.recruiterId !== recruiterId) {
    throw new ForbiddenError("You do not own this job");
  }
}

export class JobService {
  constructor(private readonly jobRepository: JobRepository) {}

  async createJob(recruiterId: string, input: CreateJobRequestBody): Promise<JobWithStages> {
    assertValidTitle(input.title);
    assertValidDescription(input.description);
    assertValidRequirements(input.requirements);
    const stages = parseStageInputs(input.stages);

    return this.jobRepository.create({
      recruiterId,
      title: input.title.trim(),
      description: input.description.trim(),
      requirements: input.requirements.trim(),
      stages: stages.map((stage, index) => ({ ...stage, order: index + 1 })),
    });
  }

  async getJobForViewer(jobId: string, viewer: AuthenticatedUser): Promise<JobWithStages> {
    const job = await this.jobRepository.findById(jobId);
    if (!job || (job.status !== JobStatus.PUBLISHED && job.recruiterId !== viewer.id)) {
      throw new NotFoundError("Job not found");
    }
    return job;
  }

  listJobsForViewer(viewer: AuthenticatedUser): Promise<JobWithStages[]> {
    if (viewer.role === Role.RECRUITER) {
      return this.jobRepository.findByRecruiter(viewer.id);
    }
    return this.jobRepository.findPublished();
  }

  async updateJob(recruiterId: string, jobId: string, input: UpdateJobRequestBody): Promise<JobWithStages> {
    const job = await this.requireOwnedJob(jobId, recruiterId);
    if (job.status === JobStatus.CLOSED) {
      throw new ConflictError("A closed job cannot be edited");
    }

    const data: { title?: string; description?: string; requirements?: string } = {};
    if (input.title !== undefined) {
      assertValidTitle(input.title);
      data.title = input.title.trim();
    }
    if (input.description !== undefined) {
      assertValidDescription(input.description);
      data.description = input.description.trim();
    }
    if (input.requirements !== undefined) {
      assertValidRequirements(input.requirements);
      data.requirements = input.requirements.trim();
    }

    return this.jobRepository.update(jobId, data);
  }

  async publishJob(recruiterId: string, jobId: string): Promise<JobWithStages> {
    const job = await this.requireOwnedJob(jobId, recruiterId);
    if (job.status !== JobStatus.DRAFT) {
      throw new ConflictError(`Cannot publish a job in ${job.status} status`);
    }
    if (job.stages.length === 0) {
      throw new ConflictError("A job needs at least one stage before it can be published");
    }
    return this.jobRepository.update(jobId, { status: JobStatus.PUBLISHED });
  }

  async closeJob(recruiterId: string, jobId: string): Promise<JobWithStages> {
    const job = await this.requireOwnedJob(jobId, recruiterId);
    if (job.status === JobStatus.CLOSED) {
      throw new ConflictError("Job is already closed");
    }
    return this.jobRepository.update(jobId, { status: JobStatus.CLOSED });
  }

  async addStage(recruiterId: string, jobId: string, input: AddJobStageRequestBody): Promise<JobWithStages> {
    const job = await this.requireOwnedJob(jobId, recruiterId);
    if (job.status === JobStatus.CLOSED) {
      throw new ConflictError("Cannot modify stages on a closed job");
    }
    assertValidStageName(input.name);
    const name = input.name.trim();
    if (job.stages.some((stage) => stage.name.toLowerCase() === name.toLowerCase())) {
      throw new ConflictError("A stage with this name already exists on this job");
    }

    const nextOrder = job.stages.reduce((max, stage) => Math.max(max, stage.order), 0) + 1;
    await this.jobRepository.addStage(jobId, { name, order: nextOrder, isTerminal: input.isTerminal === true });

    return this.requireOwnedJob(jobId, recruiterId);
  }

  async updateStage(
    recruiterId: string,
    jobId: string,
    stageId: string,
    input: UpdateJobStageRequestBody,
  ): Promise<JobWithStages> {
    const job = await this.requireOwnedJob(jobId, recruiterId);
    if (job.status === JobStatus.CLOSED) {
      throw new ConflictError("Cannot modify stages on a closed job");
    }

    const stage = job.stages.find((existing) => existing.id === stageId);
    if (!stage) {
      throw new NotFoundError("Stage not found on this job");
    }

    const data: { name?: string; isTerminal?: boolean } = {};
    if (input.name !== undefined) {
      assertValidStageName(input.name);
      const name = input.name.trim();
      if (job.stages.some((existing) => existing.id !== stageId && existing.name.toLowerCase() === name.toLowerCase())) {
        throw new ConflictError("A stage with this name already exists on this job");
      }
      data.name = name;
    }
    if (input.isTerminal !== undefined) {
      data.isTerminal = input.isTerminal === true;
    }

    await this.jobRepository.updateStage(stageId, data);
    return this.requireOwnedJob(jobId, recruiterId);
  }

  private async requireOwnedJob(jobId: string, recruiterId: string): Promise<JobWithStages> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }
    assertOwnsJob(job, recruiterId);
    return job;
  }
}
