import { InterviewStatus, JobStatus, prisma } from "@atcon/database";
import type { StageApplicationCount } from "./types.ts";

const STALE_THRESHOLD_DAYS = 14;

export class DashboardRepository {
  countOpenJobs(recruiterId: string): Promise<number> {
    return prisma.job.count({ where: { recruiterId, status: JobStatus.PUBLISHED } });
  }

  countTotalApplications(recruiterId: string): Promise<number> {
    return prisma.application.count({ where: { job: { recruiterId } } });
  }

  async applicationsByStage(recruiterId: string, jobId?: string): Promise<StageApplicationCount[]> {
    const stages = await prisma.jobStage.findMany({
      where: { job: { recruiterId, ...(jobId ? { id: jobId } : {}) } },
      select: { id: true, name: true, isTerminal: true, _count: { select: { applications: true } } },
    });

    return stages.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      isTerminal: stage.isTerminal,
      count: stage._count.applications,
    }));
  }

  async interviewCountsByStatus(recruiterId: string): Promise<Record<InterviewStatus, number>> {
    const grouped = await prisma.interview.groupBy({
      by: ["status"],
      where: { application: { job: { recruiterId } } },
      _count: true,
    });

    const counts: Record<InterviewStatus, number> = {
      [InterviewStatus.SCHEDULED]: 0,
      [InterviewStatus.RESCHEDULED]: 0,
      [InterviewStatus.CANCELLED]: 0,
      [InterviewStatus.COMPLETED]: 0,
    };
    for (const row of grouped) {
      counts[row.status] = row._count;
    }
    return counts;
  }

  countActiveApplications(recruiterId: string): Promise<number> {
    return prisma.application.count({ where: { job: { recruiterId }, currentStage: { isTerminal: false } } });
  }

  countTerminalApplications(recruiterId: string): Promise<number> {
    return prisma.application.count({ where: { job: { recruiterId }, currentStage: { isTerminal: true } } });
  }

  countStaleApplications(recruiterId: string): Promise<number> {
    const threshold = new Date(Date.now() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    return prisma.application.count({
      where: { job: { recruiterId }, currentStage: { isTerminal: false }, updatedAt: { lt: threshold } },
    });
  }

  async averageTimeToHireDays(recruiterId: string): Promise<number | null> {
    const hiredTransitions = await prisma.applicationStageHistory.findMany({
      where: {
        toStage: { isTerminal: true, name: { equals: "Hired", mode: "insensitive" } },
        application: { job: { recruiterId } },
      },
      select: { changedAt: true, application: { select: { appliedAt: true } } },
    });

    if (hiredTransitions.length === 0) {
      return null;
    }

    const totalDays = hiredTransitions.reduce((sum, record) => {
      const days = (record.changedAt.getTime() - record.application.appliedAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return Math.round((totalDays / hiredTransitions.length) * 10) / 10;
  }
}
