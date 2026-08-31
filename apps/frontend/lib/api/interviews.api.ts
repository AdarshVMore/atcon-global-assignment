import { apiClient } from "./client";
import type { Interview, InterviewScorecard, ScorecardRecommendation } from "@/types/interviews";

export interface ScheduleInterviewInput {
  scheduledAt: string;
  durationMinutes: number;
  interviewerId?: string;
  meetingUrl?: string;
  notes?: string;
}

export interface UpdateInterviewInput {
  durationMinutes?: number;
  meetingUrl?: string;
  notes?: string;
}

export interface SubmitScorecardInput {
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  recommendation: ScorecardRecommendation;
  feedback?: string;
}

export const interviewsApi = {
  schedule: (applicationId: string, input: ScheduleInterviewInput) =>
    apiClient.post<Interview>(`/applications/${applicationId}/interviews`, input),
  listForApplication: (applicationId: string) =>
    apiClient.get<{ interviews: Interview[] }>(`/applications/${applicationId}/interviews`),
  getById: (interviewId: string) => apiClient.get<Interview>(`/interviews/${interviewId}`),
  update: (interviewId: string, input: UpdateInterviewInput) =>
    apiClient.patch<Interview>(`/interviews/${interviewId}`, input),
  reschedule: (interviewId: string, scheduledAt: string) =>
    apiClient.post<Interview>(`/interviews/${interviewId}/reschedule`, { scheduledAt }),
  cancel: (interviewId: string) => apiClient.post<Interview>(`/interviews/${interviewId}/cancel`),
  complete: (interviewId: string) => apiClient.post<Interview>(`/interviews/${interviewId}/complete`),
  submitScorecard: (interviewId: string, input: SubmitScorecardInput) =>
    apiClient.post<InterviewScorecard>(`/interviews/${interviewId}/scorecard`, input),
};
