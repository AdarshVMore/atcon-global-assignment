import type { Notification } from "@atcon/database";
import type { Redis } from "ioredis";

export const NOTIFICATION_CHANNEL = "notification.created";

export interface NotificationEvent {
  userId: string;
  notification: Notification;
}

export function publishNotificationCreated(connection: Redis, event: NotificationEvent): Promise<number> {
  return connection.publish(NOTIFICATION_CHANNEL, JSON.stringify(event));
}
