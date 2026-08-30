import type { NotificationType } from "@atcon/database";
import { Queue } from "bullmq";
import { connection, defaultJobOptions } from "./queue.service.ts";

export interface NotificationSendJobData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

export const NOTIFICATION_SEND_QUEUE_NAME = "notification.send";

export const notificationSendQueue = new Queue<NotificationSendJobData>(NOTIFICATION_SEND_QUEUE_NAME, {
  connection,
  defaultJobOptions,
});
