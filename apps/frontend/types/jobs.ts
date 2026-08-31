export type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface JobStage {
  id: string;
  name: string;
  order: number;
  isTerminal: boolean;
}

export interface Job {
  id: string;
  recruiterId: string;
  title: string;
  description: string;
  requirements: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  stages: JobStage[];
}
