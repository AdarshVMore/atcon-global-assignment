import { describe, expect, test } from "bun:test";
import { NotificationType, type Notification } from "@atcon/database";
import type { Queue } from "bullmq";
import { NotificationService } from "./notification.service.ts";
import type { NotificationRepository } from "./notification.repository.ts";
import type { NotificationSendJobData } from "../queue/jobs.ts";

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notification-1",
    userId: "user-1",
    type: NotificationType.APPLICATION_RECEIVED,
    title: "New application received",
    message: "A candidate applied",
    isRead: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function fakeRepository(overrides: Partial<NotificationRepository> = {}): NotificationRepository {
  return {
    create: async () => buildNotification(),
    findById: async () => buildNotification(),
    findByUserId: async () => [buildNotification()],
    markAsRead: async () => buildNotification({ isRead: true }),
    ...overrides,
  } as NotificationRepository;
}

function fakeQueue(overrides: Partial<Queue<NotificationSendJobData>> = {}): Queue<NotificationSendJobData> {
  return { add: async () => ({}) as never, ...overrides } as unknown as Queue<NotificationSendJobData>;
}

describe("NotificationService.notifyAsync", () => {
  test("enqueues a job with the given payload", async () => {
    let enqueued: unknown;
    const service = new NotificationService(
      fakeRepository(),
      fakeQueue({ add: async (_name, data) => { enqueued = data; return {} as never; } }),
    );

    await service.notifyAsync("user-1", NotificationType.APPLICATION_RECEIVED, "Title", "Message");

    expect(enqueued).toEqual({ userId: "user-1", type: NotificationType.APPLICATION_RECEIVED, title: "Title", message: "Message" });
  });

  test("does not throw when the queue fails", async () => {
    const service = new NotificationService(
      fakeRepository(),
      fakeQueue({ add: async () => { throw new Error("redis is down"); } }),
    );

    await expect(
      service.notifyAsync("user-1", NotificationType.APPLICATION_RECEIVED, "Title", "Message"),
    ).resolves.toBeUndefined();
  });
});

describe("NotificationService.markAsRead", () => {
  test("rejects marking someone else's notification as read", async () => {
    const service = new NotificationService(fakeRepository(), fakeQueue());

    await expect(service.markAsRead("notification-1", "someone-else")).rejects.toThrow(
      "This notification does not belong to you",
    );
  });

  test("rejects an unknown notification", async () => {
    const service = new NotificationService(fakeRepository({ findById: async () => null }), fakeQueue());

    await expect(service.markAsRead("missing", "user-1")).rejects.toThrow("Notification not found");
  });

  test("marks the owner's notification as read", async () => {
    const service = new NotificationService(fakeRepository(), fakeQueue());

    const result = await service.markAsRead("notification-1", "user-1");

    expect(result.isRead).toBe(true);
  });
});
