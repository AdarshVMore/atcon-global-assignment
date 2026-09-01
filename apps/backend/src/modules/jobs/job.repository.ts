import { JobStatus, prisma, type Job, type JobStage } from "@atcon/database";

export type JobWithStages = Job & { stages: JobStage[] };

export interface CreateJobInput {
  recruiterId: string;
  title: string;
  description: string;
  requirements: string;
  stages: { name: string; order: number; isTerminal: boolean }[];
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  requirements?: string;
  status?: JobStatus;
}

export interface AddStageInput {
  name: string;
  order: number;
  isTerminal: boolean;
}

export interface UpdateStageInput {
  name?: string;
  isTerminal?: boolean;
}

const stagesOrderedByOrder = { stages: { orderBy: { order: "asc" as const } } };

export class JobRepository {
  create(input: CreateJobInput): Promise<JobWithStages> {
    return prisma.job.create({
      data: {
        recruiterId: input.recruiterId,
        title: input.title,
        description: input.description,
        requirements: input.requirements,
        stages: { create: input.stages },
      },
      include: stagesOrderedByOrder,
    });
  }

  findById(id: string): Promise<JobWithStages | null> {
    return prisma.job.findUnique({ where: { id }, include: stagesOrderedByOrder });
  }

  findPublished(): Promise<JobWithStages[]> {
    return prisma.job.findMany({
      where: { status: JobStatus.PUBLISHED },
      include: stagesOrderedByOrder,
      orderBy: { createdAt: "desc" },
    });
  }

  findByRecruiter(recruiterId: string): Promise<JobWithStages[]> {
    return prisma.job.findMany({
      where: { recruiterId },
      include: stagesOrderedByOrder,
      orderBy: { createdAt: "desc" },
    });
  }

  update(id: string, data: UpdateJobInput): Promise<JobWithStages> {
    const contentChanged = data.title !== undefined || data.description !== undefined || data.requirements !== undefined;
    return prisma.job.update({
      where: { id },
      // The cached ranking embedding reflects title+description+requirements
      // — invalidate it whenever any of those change so ranking recomputes
      // it against the current text instead of matching against stale text.
      data: contentChanged ? { ...data, embedding: [] } : data,
      include: stagesOrderedByOrder,
    });
  }

  updateEmbedding(id: string, embedding: number[]): Promise<JobWithStages> {
    return prisma.job.update({ where: { id }, data: { embedding }, include: stagesOrderedByOrder });
  }

  addStage(jobId: string, stage: AddStageInput): Promise<JobStage> {
    return prisma.jobStage.create({ data: { jobId, ...stage } });
  }

  updateStage(stageId: string, data: UpdateStageInput): Promise<JobStage> {
    return prisma.jobStage.update({ where: { id: stageId }, data });
  }
}
