import { apiClient } from "./client";
import type { Application, StageHistoryEntry } from "@/types/applications";

export const applicationsApi = {
  apply: (jobId: string, resumeId: string) =>
    apiClient.post<Application>(`/jobs/${jobId}/applications`, { resumeId }),
  list: (jobId?: string) => {
    const query = jobId ? `?jobId=${jobId}` : "";
    return apiClient.get<{ applications: Application[] }>(`/applications${query}`);
  },
  getById: (applicationId: string) => apiClient.get<Application>(`/applications/${applicationId}`),
  getHistory: (applicationId: string) =>
    apiClient.get<{ history: StageHistoryEntry[] }>(`/applications/${applicationId}/history`),
  moveStage: (applicationId: string, stageId: string, reason?: string) =>
    apiClient.patch<Application>(`/applications/${applicationId}/stage`, { stageId, reason }),
};
