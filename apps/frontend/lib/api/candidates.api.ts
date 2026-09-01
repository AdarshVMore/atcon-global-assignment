import { API_BASE_URL, apiClient } from "./client";
import { ApiError } from "./error";
import { getStoredToken } from "@/lib/auth/token";
import type { CandidateProfile, CandidateProfileWithResumes, Resume } from "@/types/candidates";

export const candidatesApi = {
  getProfile: () => apiClient.get<CandidateProfile>("/candidates/me"),
  updateProfile: (phone: string) => apiClient.patch<CandidateProfile>("/candidates/me", { phone }),
  listResumes: () => apiClient.get<{ resumes: Resume[] }>("/candidates/me/resumes"),
  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload<Resume>("/candidates/me/resumes", formData);
  },
  getForApplication: (applicationId: string) =>
    apiClient.get<CandidateProfileWithResumes>(`/applications/${applicationId}/candidate`),
  // Binary response — can't go through apiClient's JSON-only request().
  getResumeFile: async (applicationId: string, resumeId: string): Promise<Blob> => {
    const token = getStoredToken();
    const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/candidate/resumes/${resumeId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiError(response.status, body?.error?.message ?? "Could not load this resume");
    }
    return response.blob();
  },
};
