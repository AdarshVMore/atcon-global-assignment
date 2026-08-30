import { prisma, type Application, type ApplicationStageHistory, type JobStage } from "@atcon/database";

export type ApplicationWithRelations = Application & {
  job: { id: string; title: string; recruiterId: string; status: string };
  currentStage: JobStage;
  stageHistory: ApplicationStageHistory[];
};

export interface CreateApplicationInput {
  candidateId: string;
  jobId: string;
  currentStageId: string;
  resumeId: string;
  changedById: string;
}

const detailInclude = {
  job: { select: { id: true, title: true, recruiterId: true, status: true } },
  currentStage: true,
  stageHistory: { orderBy: { changedAt: "asc" as const } },
};

export class ApplicationRepository {
  create(input: CreateApplicationInput): Promise<ApplicationWithRelations> {
    return prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          candidateId: input.candidateId,
          jobId: input.jobId,
          currentStageId: input.currentStageId,
          resumeId: input.resumeId,
        },
      });

      await tx.applicationStageHistory.create({
        data: {
          applicationId: application.id,
          fromStageId: null,
          toStageId: input.currentStageId,
          changedById: input.changedById,
          reason: "Application submitted",
        },
      });

      return tx.application.findUniqueOrThrow({ where: { id: application.id }, include: detailInclude });
    });
  }

  findById(id: string): Promise<ApplicationWithRelations | null> {
    return prisma.application.findUnique({ where: { id }, include: detailInclude });
  }

  findByCandidateId(candidateId: string): Promise<ApplicationWithRelations[]> {
    return prisma.application.findMany({
      where: { candidateId },
      include: detailInclude,
      orderBy: { appliedAt: "desc" },
    });
  }

  findByRecruiter(recruiterId: string, jobId?: string): Promise<ApplicationWithRelations[]> {
    return prisma.application.findMany({
      where: { job: { recruiterId }, ...(jobId ? { jobId } : {}) },
      include: detailInclude,
      orderBy: { appliedAt: "desc" },
    });
  }

  async existsForCandidateAndJob(candidateId: string, jobId: string): Promise<boolean> {
    const count = await prisma.application.count({ where: { candidateId, jobId } });
    return count > 0;
  }
}
