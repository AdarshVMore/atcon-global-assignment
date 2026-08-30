import type { JobRepository } from "../jobs/job.repository.ts";
import { NotFoundError } from "../../shared/errors/HttpError.ts";
import { DashboardRepository } from "./dashboard.repository.ts";
import type { DashboardOverview, JobPipeline } from "./dashboard.types.ts";

export class DashboardService {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly jobRepository: JobRepository,
  ) {}

  async getOverview(recruiterId: string): Promise<DashboardOverview> {
    const [openJobs, totalApplications, applicationsByStage, interviewCounts, activeApplications, terminalApplications, staleApplications, timeToHireDays] =
      await Promise.all([
        this.dashboardRepository.countOpenJobs(recruiterId),
        this.dashboardRepository.countTotalApplications(recruiterId),
        this.dashboardRepository.applicationsByStage(recruiterId),
        this.dashboardRepository.interviewCountsByStatus(recruiterId),
        this.dashboardRepository.countActiveApplications(recruiterId),
        this.dashboardRepository.countTerminalApplications(recruiterId),
        this.dashboardRepository.countStaleApplications(recruiterId),
        this.dashboardRepository.averageTimeToHireDays(recruiterId),
      ]);

    return {
      openJobs,
      totalApplications,
      applicationsByStage,
      interviewCounts,
      pipelineHealth: { activeApplications, terminalApplications, staleApplications },
      timeToHireDays,
    };
  }

  async getJobPipeline(recruiterId: string, jobId: string): Promise<JobPipeline> {
    const job = await this.jobRepository.findById(jobId);
    if (!job || job.recruiterId !== recruiterId) {
      throw new NotFoundError("Job not found");
    }

    const stages = [...job.stages]
      .sort((a, b) => a.order - b.order)
      .map((stage) => ({
        stageId: stage.id,
        stageName: stage.name,
        order: stage.order,
        isTerminal: stage.isTerminal,
        applicationCount: 0,
      }));

    const stageCounts = await this.dashboardRepository.applicationsByStage(recruiterId, jobId);
    const countsByStageId = new Map(stageCounts.map((entry) => [entry.stageId, entry.count]));
    for (const stage of stages) {
      stage.applicationCount = countsByStageId.get(stage.stageId) ?? 0;
    }

    return {
      jobId: job.id,
      jobTitle: job.title,
      totalApplications: stages.reduce((sum, stage) => sum + stage.applicationCount, 0),
      stages,
    };
  }
}
