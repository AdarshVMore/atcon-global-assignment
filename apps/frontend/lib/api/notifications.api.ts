import { apiClient } from "./client";
import type { Notification } from "@/types/notifications";

export const notificationsApi = {
  list: () => apiClient.get<{ notifications: Notification[] }>("/notifications"),
  markAsRead: (notificationId: string) =>
    apiClient.patch<Notification>(`/notifications/${notificationId}/read`),
};
