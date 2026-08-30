export interface StageApplicationCount {
  stageId: string;
  stageName: string;
  isTerminal: boolean;
  count: number;
}

export interface PipelineHealth {
  activeApplications: number;
  terminalApplications: number;
  staleApplications: number;
}

export interface DashboardOverview {
  openJobs: number;
  totalApplications: number;
  applicationsByStage: StageApplicationCount[];
  interviewCounts: Record<string, number>;
  pipelineHealth: PipelineHealth;
  timeToHireDays: number | null;
}

export interface JobPipelineStage {
  stageId: string;
  stageName: string;
  order: number;
  isTerminal: boolean;
  applicationCount: number;
}

export interface JobPipeline {
  jobId: string;
  jobTitle: string;
  totalApplications: number;
  stages: JobPipelineStage[];
}
