import { prisma, type Application, type ApplicationStageHistory, type JobStage, type Prisma } from "@atcon/database";

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

export interface MoveToStageInput {
  applicationId: string;
  fromStageId: string;
  toStageId: string;
  changedById: string;
  reason?: string;
}

export interface RankingResultInput {
  score: number;
  explanation: Prisma.InputJsonValue;
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

  moveToStage(input: MoveToStageInput): Promise<ApplicationWithRelations> {
    return prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: input.applicationId },
        data: { currentStageId: input.toStageId },
      });

      await tx.applicationStageHistory.create({
        data: {
          applicationId: input.applicationId,
          fromStageId: input.fromStageId,
          toStageId: input.toStageId,
          changedById: input.changedById,
          reason: input.reason,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: input.changedById,
          action: "APPLICATION_STAGE_CHANGED",
          resourceType: "Application",
          resourceId: input.applicationId,
          previousState: { stageId: input.fromStageId },
          newState: { stageId: input.toStageId },
        },
      });

      return tx.application.findUniqueOrThrow({ where: { id: input.applicationId }, include: detailInclude });
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

  updateRanking(applicationId: string, input: RankingResultInput): Promise<ApplicationWithRelations> {
    return prisma.application.update({
      where: { id: applicationId },
      data: { rankingScore: input.score, rankingExplanation: input.explanation, rankedAt: new Date() },
      include: detailInclude,
    });
  }
}
