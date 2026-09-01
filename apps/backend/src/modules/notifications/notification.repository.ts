import { prisma, type Notification, type NotificationType } from "@atcon/database";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

export class NotificationRepository {
  /**
   * Upserts on the triggering BullMQ job's id, which stays the same across
   * every retry/redelivery of that job — so a redelivered job finds the row
   * this same job already created instead of inserting a duplicate.
   */
  findOrCreateBySourceJobId(sourceJobId: string, input: CreateNotificationInput): Promise<Notification> {
    return prisma.notification.upsert({
      where: { sourceJobId },
      create: { ...input, sourceJobId },
      update: {},
    });
  }

  markProcessed(id: string): Promise<Notification> {
    return prisma.notification.update({ where: { id }, data: { processedAt: new Date() } });
  }

  findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({ where: { id } });
  }

  findByUserId(userId: string): Promise<Notification[]> {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  markAsRead(id: string): Promise<Notification> {
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  }
}
