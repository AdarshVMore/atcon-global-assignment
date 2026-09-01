import { apiClient } from "./client";
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
};
