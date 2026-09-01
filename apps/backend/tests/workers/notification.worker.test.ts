import { describe, expect, test } from "bun:test";
import { NotificationType, Role, type Notification, type User } from "@atcon/database";
import type { Job } from "bullmq";
import type IORedis from "ioredis";
import { createNotificationSendProcessor } from "../../src/workers/notification.worker.ts";
import type { UserRepository } from "../../src/modules/auth/auth.repository.ts";
import type { EmailMessage, EmailSender } from "../../src/modules/notifications/emailSender.ts";
import type { CreateNotificationInput, NotificationRepository } from "../../src/modules/notifications/notification.repository.ts";
import { NOTIFICATION_CHANNEL } from "../../src/modules/notifications/notificationPubSub.ts";
import type { NotificationSendJobData } from "../../src/queues/notification.queue.ts";

function fakeNotificationRepository(overrides: Partial<NotificationRepository> = {}): NotificationRepository & {
  created: CreateNotificationInput[];
  rows: Map<string, Notification>;
} {
  const created: CreateNotificationInput[] = [];
  const rows = new Map<string, Notification>();
  return {
    created,
    rows,
    findOrCreateBySourceJobId: async (sourceJobId, input) => {
      const existing = rows.get(sourceJobId);
      if (existing) {
        return existing;
      }
      created.push(input);
      const notification = {
        id: `notification-${rows.size + 1}`,
        isRead: false,
        createdAt: new Date(),
        processedAt: null,
        sourceJobId,
        ...input,
      } as Notification;
      rows.set(sourceJobId, notification);
      return notification;
    },
    markProcessed: async (id) => {
      const notification = [...rows.values()].find((row) => row.id === id);
      if (!notification) {
        throw new Error("not found");
      }
      const processed = { ...notification, processedAt: new Date() };
      rows.set(notification.sourceJobId, processed);
      return processed;
    },
    findById: async () => null,
    findByUserId: async () => [],
    markAsRead: async () => {
      throw new Error("not used");
    },
    ...overrides,
  } as NotificationRepository & { created: CreateNotificationInput[]; rows: Map<string, Notification> };
}

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findById: async () => ({ id: "user-1", email: "user@atcon.dev", role: Role.RECRUITER } as User),
    findByEmail: async () => null,
    createWithRole: async () => {
      throw new Error("not used");
    },
    ...overrides,
  } as UserRepository;
}

function fakeEmailSender(overrides: Partial<EmailSender> = {}): EmailSender & { sent: EmailMessage[] } {
  const sent: EmailMessage[] = [];
  return {
    sent,
    send: async (message) => {
      sent.push(message);
    },
    ...overrides,
  } as EmailSender & { sent: EmailMessage[] };
}

function buildJob(data: NotificationSendJobData, id = "job-1"): Job<NotificationSendJobData> {
  return { id, data } as Job<NotificationSendJobData>;
}

function fakePublisherConnection(overrides: Partial<IORedis> = {}): IORedis & { published: [string, string][] } {
  const published: [string, string][] = [];
  return {
    published,
    publish: async (channel: string, message: string) => {
      published.push([channel, message]);
      return 1;
    },
    ...overrides,
  } as IORedis & { published: [string, string][] };
}

describe("notificationSend worker processor", () => {
  test("creates the in-app notification and sends an email", async () => {
    const notificationRepository = fakeNotificationRepository();
    const emailSender = fakeEmailSender();
    const publisher = fakePublisherConnection();
    const processor = createNotificationSendProcessor(notificationRepository, fakeUserRepository(), emailSender, publisher);

    await processor(
      buildJob({
        userId: "user-1",
        type: NotificationType.APPLICATION_RECEIVED,
        title: "New application",
        message: "A candidate applied",
      }),
    );

    expect(notificationRepository.created).toEqual([
      { userId: "user-1", type: NotificationType.APPLICATION_RECEIVED, title: "New application", message: "A candidate applied" },
    ]);
    expect(emailSender.sent).toEqual([{ to: "user@atcon.dev", subject: "New application", body: "A candidate applied" }]);
  });

  test("skips the email but still records the notification if the user no longer exists", async () => {
    const notificationRepository = fakeNotificationRepository();
    const emailSender = fakeEmailSender();
    const processor = createNotificationSendProcessor(
      notificationRepository,
      fakeUserRepository({ findById: async () => null }),
      emailSender,
      fakePublisherConnection(),
    );

    await processor(
      buildJob({ userId: "deleted-user", type: NotificationType.APPLICATION_RECEIVED, title: "x", message: "y" }),
    );

    expect(notificationRepository.created.length).toBe(1);
    expect(emailSender.sent).toEqual([]);
  });

  test("redelivering the same job does not create a duplicate row or resend the email", async () => {
    const notificationRepository = fakeNotificationRepository();
    const emailSender = fakeEmailSender();
    const processor = createNotificationSendProcessor(
      notificationRepository,
      fakeUserRepository(),
      emailSender,
      fakePublisherConnection(),
    );
    const jobData: NotificationSendJobData = {
      userId: "user-1",
      type: NotificationType.APPLICATION_RECEIVED,
      title: "New application",
      message: "A candidate applied",
    };

    await processor(buildJob(jobData, "job-42"));
    await processor(buildJob(jobData, "job-42"));

    expect(notificationRepository.created.length).toBe(1);
    expect(emailSender.sent.length).toBe(1);
  });

  test("publishes a notification.created event for real-time delivery", async () => {
    const notificationRepository = fakeNotificationRepository();
    const emailSender = fakeEmailSender();
    const publisher = fakePublisherConnection();
    const processor = createNotificationSendProcessor(notificationRepository, fakeUserRepository(), emailSender, publisher);

    await processor(
      buildJob({
        userId: "user-1",
        type: NotificationType.APPLICATION_RECEIVED,
        title: "New application",
        message: "A candidate applied",
      }),
    );

    expect(publisher.published.length).toBe(1);
    const [channel, message] = publisher.published[0]!;
    expect(channel).toBe(NOTIFICATION_CHANNEL);
    const payload = JSON.parse(message) as { userId: string; notification: { title: string; processedAt: string | null } };
    expect(payload.userId).toBe("user-1");
    expect(payload.notification.title).toBe("New application");
    expect(payload.notification.processedAt).not.toBeNull();
  });

  test("does not re-publish on a redelivery that's already processed", async () => {
    const notificationRepository = fakeNotificationRepository();
    const emailSender = fakeEmailSender();
    const publisher = fakePublisherConnection();
    const processor = createNotificationSendProcessor(notificationRepository, fakeUserRepository(), emailSender, publisher);
    const jobData: NotificationSendJobData = {
      userId: "user-1",
      type: NotificationType.APPLICATION_RECEIVED,
      title: "New application",
      message: "A candidate applied",
    };

    await processor(buildJob(jobData, "job-42"));
    await processor(buildJob(jobData, "job-42"));

    expect(publisher.published.length).toBe(1);
  });

  test("a publish failure doesn't fail the job — the row is still processed", async () => {
    const notificationRepository = fakeNotificationRepository();
    const emailSender = fakeEmailSender();
    const publisher = fakePublisherConnection({
      publish: async () => {
        throw new Error("redis is down");
      },
    });
    const processor = createNotificationSendProcessor(notificationRepository, fakeUserRepository(), emailSender, publisher);

    await processor(
      buildJob({
        userId: "user-1",
        type: NotificationType.APPLICATION_RECEIVED,
        title: "New application",
        message: "A candidate applied",
      }),
    );

    expect(notificationRepository.created.length).toBe(1);
    expect(emailSender.sent.length).toBe(1);
  });
});
