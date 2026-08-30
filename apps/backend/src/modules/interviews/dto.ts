export interface ScheduleInterviewRequestBody {
  scheduledAt?: unknown;
  durationMinutes?: unknown;
  interviewerId?: unknown;
  meetingUrl?: unknown;
  notes?: unknown;
}

export interface UpdateInterviewRequestBody {
  durationMinutes?: unknown;
  meetingUrl?: unknown;
  notes?: unknown;
}

export interface RescheduleInterviewRequestBody {
  scheduledAt?: unknown;
}

export interface SubmitScorecardRequestBody {
  technicalScore?: unknown;
  communicationScore?: unknown;
  problemSolvingScore?: unknown;
  recommendation?: unknown;
  feedback?: unknown;
}
