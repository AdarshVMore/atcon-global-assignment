import type { JobStage } from "./jobs";

export interface StageHistoryEntry {
  id: string;
  applicationId: string;
  fromStageId: string | null;
  toStageId: string;
  changedById: string | null;
  reason: string | null;
  changedAt: string;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  job: { id: string; title: string; recruiterId: string; status: string };
  currentStageId: string;
  currentStage: JobStage;
  resumeId: string | null;
  appliedAt: string;
  rankingScore: number | null;
  rankingExplanation: unknown;
  rankedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stageHistory: StageHistoryEntry[];
}
