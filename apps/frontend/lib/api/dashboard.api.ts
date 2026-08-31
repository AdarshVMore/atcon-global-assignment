import { apiClient } from "./client";
import type { DashboardOverview, JobPipeline } from "@/types/dashboard";

export const dashboardApi = {
  overview: () => apiClient.get<DashboardOverview>("/dashboard/overview"),
  jobPipeline: (jobId: string) => apiClient.get<JobPipeline>(`/jobs/${jobId}/pipeline`),
};
