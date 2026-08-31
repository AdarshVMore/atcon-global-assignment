export type InterviewStatus = "SCHEDULED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED";
export type ScorecardRecommendation = "STRONG_YES" | "YES" | "NO" | "STRONG_NO";

export interface InterviewScorecard {
  id: string;
  interviewId: string;
  submittedById: string;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  recommendation: ScorecardRecommendation;
  feedback: string | null;
  createdAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  interviewerId: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: InterviewStatus;
  meetingUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  scorecard: InterviewScorecard | null;
}
