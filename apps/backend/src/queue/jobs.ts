import type { NotificationType } from "@atcon/database";

export interface ResumeParseJobData {
  resumeId: string;
}

export interface ApplicationRankJobData {
  applicationId: string;
}

export interface NotificationSendJobData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}
