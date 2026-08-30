import type { Job, Worker } from "bullmq";
import { UserRepository } from "../auth/user.repository.ts";
import type { EmailSender } from "../notifications/emailSender.ts";
import { ConsoleEmailSender } from "../notifications/emailSender.ts";
import { NotificationRepository } from "../notifications/notification.repository.ts";
import { createWorker } from "../queue/createWorker.ts";
import type { NotificationSendJobData } from "../queue/jobs.ts";
import { QUEUE_NAMES } from "../queue/queueNames.ts";

export function createNotificationSendProcessor(
  notificationRepository: NotificationRepository,
  userRepository: UserRepository,
  emailSender: EmailSender,
) {
  return async function processNotificationSendJob(job: Job<NotificationSendJobData>): Promise<void> {
    const { userId, type, title, message } = job.data;

    await notificationRepository.create({ userId, type, title, message });

    const user = await userRepository.findById(userId);
    if (!user) {
      // The user no longer exists — the in-app notification above is
      // orphaned but harmless; there's nowhere to email.
      return;
    }

    await emailSender.send({ to: user.email, subject: title, body: message });
  };
}

export function startNotificationSendWorker(): Worker<NotificationSendJobData> {
  const notificationRepository = new NotificationRepository();
  const userRepository = new UserRepository();
  const emailSender = new ConsoleEmailSender();

  return createWorker<NotificationSendJobData>(
    QUEUE_NAMES.NOTIFICATION_SEND,
    createNotificationSendProcessor(notificationRepository, userRepository, emailSender),
  );
}
