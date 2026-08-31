import { apiClient } from "./client";
import type { Job } from "@/types/jobs";

export interface CreateJobInput {
  title: string;
  description: string;
  requirements: string;
  stages?: { name: string; isTerminal?: boolean }[];
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  requirements?: string;
}

export interface AddStageInput {
  name: string;
  isTerminal?: boolean;
}

export interface UpdateStageInput {
  name?: string;
  isTerminal?: boolean;
}

export const jobsApi = {
  list: () => apiClient.get<{ jobs: Job[] }>("/jobs"),
  getById: (jobId: string) => apiClient.get<Job>(`/jobs/${jobId}`),
  create: (input: CreateJobInput) => apiClient.post<Job>("/jobs", input),
  update: (jobId: string, input: UpdateJobInput) => apiClient.patch<Job>(`/jobs/${jobId}`, input),
  publish: (jobId: string) => apiClient.post<Job>(`/jobs/${jobId}/publish`),
  close: (jobId: string) => apiClient.post<Job>(`/jobs/${jobId}/close`),
  addStage: (jobId: string, input: AddStageInput) => apiClient.post<Job>(`/jobs/${jobId}/stages`, input),
  updateStage: (jobId: string, stageId: string, input: UpdateStageInput) =>
    apiClient.patch<Job>(`/jobs/${jobId}/stages/${stageId}`, input),
};
