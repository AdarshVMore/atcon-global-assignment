import type { Notification, NotificationType } from "@atcon/database";
import type { Queue } from "bullmq";
import type { NotificationSendJobData } from "../queue/jobs.ts";
import { ForbiddenError, NotFoundError } from "../shared/http/HttpError.ts";
import { logger } from "../shared/logger.ts";
import { NotificationRepository } from "./notification.repository.ts";

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationQueue: Queue<NotificationSendJobData>,
  ) {}

  /**
   * Fire-and-forget: enqueues the notification and returns. The event that
   * triggered this (a stage change, a new application, ...) has already
   * committed — a notification failure must never roll that back.
   */
  async notifyAsync(userId: string, type: NotificationType, title: string, message: string): Promise<void> {
    try {
      await this.notificationQueue.add("notify", { userId, type, title, message });
    } catch (error) {
      logger.warn("Failed to enqueue notification.send job", {
        userId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  listForUser(userId: string): Promise<Notification[]> {
    return this.notificationRepository.findByUserId(userId);
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new NotFoundError("Notification not found");
    }
    if (notification.userId !== userId) {
      throw new ForbiddenError("This notification does not belong to you");
    }
    if (notification.isRead) {
      return notification;
    }
    return this.notificationRepository.markAsRead(notificationId);
  }
}
