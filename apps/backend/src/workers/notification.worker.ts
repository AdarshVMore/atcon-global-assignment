import type { Job, Worker } from "bullmq";
import { UserRepository } from "../modules/auth/auth.repository.ts";
import type { EmailSender } from "../modules/notifications/emailSender.ts";
import { ConsoleEmailSender } from "../modules/notifications/emailSender.ts";
import { NotificationRepository } from "../modules/notifications/notification.repository.ts";
import { createWorker } from "../queues/queue.service.ts";
import { NOTIFICATION_SEND_QUEUE_NAME, type NotificationSendJobData } from "../queues/notification.queue.ts";

export function createNotificationSendProcessor(
  notificationRepository: NotificationRepository,
  userRepository: UserRepository,
  emailSender: EmailSender,
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
    await notificationRepository.markProcessed(notification.id);
  };
}

export function startNotificationSendWorker(): Worker<NotificationSendJobData> {
  const notificationRepository = new NotificationRepository();
  const userRepository = new UserRepository();
  const emailSender = new ConsoleEmailSender();

  return createWorker<NotificationSendJobData>(
    NOTIFICATION_SEND_QUEUE_NAME,
    createNotificationSendProcessor(notificationRepository, userRepository, emailSender),
  );
}
