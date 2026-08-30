import { prisma, type Notification, type NotificationType } from "@atcon/database";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

export class NotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification> {
    return prisma.notification.create({ data: input });
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
