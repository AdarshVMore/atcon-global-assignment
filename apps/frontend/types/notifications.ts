export type NotificationType =
  | "APPLICATION_RECEIVED"
  | "APPLICATION_STAGE_CHANGED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_RESCHEDULED"
  | "INTERVIEW_CANCELLED";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
