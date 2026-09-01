import type { Job, Worker } from "bullmq";
import type IORedis from "ioredis";
import { UserRepository } from "../modules/auth/auth.repository.ts";
import type { EmailSender } from "../modules/notifications/emailSender.ts";
import { ConsoleEmailSender } from "../modules/notifications/emailSender.ts";
import { NotificationRepository } from "../modules/notifications/notification.repository.ts";
import { publishNotificationCreated } from "../modules/notifications/notificationPubSub.ts";
import { createRedisConnection } from "../infrastructure/redis/redisConnection.ts";
import { createWorker } from "../queues/queue.service.ts";
import { NOTIFICATION_SEND_QUEUE_NAME, type NotificationSendJobData } from "../queues/notification.queue.ts";
import { logger } from "../shared/utils/logger.ts";

export function createNotificationSendProcessor(
  notificationRepository: NotificationRepository,
  userRepository: UserRepository,
  emailSender: EmailSender,
  publisherConnection: IORedis,
) {
  return async function processNotificationSendJob(job: Job<NotificationSendJobData>): Promise<void> {
    if (!job.id) {
      throw new Error("Notification job is missing a BullMQ job id — cannot guarantee idempotent delivery");
    }
    const { userId, type, title, message } = job.data;

    const notification = await notificationRepository.findOrCreateBySourceJobId(job.id, {
      userId,
      type,
      title,
      message,
    });
    if (notification.processedAt) {
      // Already fully handled by an earlier delivery of this same job —
      // sending the email again would double-notify the user.
      return;
    }

    const user = await userRepository.findById(userId);
    if (user) {
      await emailSender.send({ to: user.email, subject: title, body: message });
    }
    // No email needed when the user no longer exists — the in-app
    // notification above is orphaned but harmless. Either way this job's
    // work is done, so mark it processed to keep redelivery a no-op.
    const processed = await notificationRepository.markProcessed(notification.id);

    // Real-time push for anyone with an open SSE connection — best effort,
    // the frontend's poll is still the source of truth if this is missed.
    await publishNotificationCreated(publisherConnection, { userId, notification: processed }).catch((error) => {
      logger.warn("Failed to publish notification.created event", {
        notificationId: processed.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  };
}

export function startNotificationSendWorker(): Worker<NotificationSendJobData> {
  const notificationRepository = new NotificationRepository();
  const userRepository = new UserRepository();
  const emailSender = new ConsoleEmailSender();
  const publisherConnection = createRedisConnection();

  return createWorker<NotificationSendJobData>(
    NOTIFICATION_SEND_QUEUE_NAME,
    createNotificationSendProcessor(notificationRepository, userRepository, emailSender, publisherConnection),
  );
}
