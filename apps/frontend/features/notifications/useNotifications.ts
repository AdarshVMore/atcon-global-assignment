"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api/client";
import { notificationsApi } from "@/lib/api/notifications.api";
import { getStoredToken } from "@/lib/auth/token";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list().then((res) => res.notifications),
    enabled: !!getStoredToken(),
    // Kept as a fallback even with the SSE push below — if the stream drops
    // or an event is missed, this still catches up within 30s.
    refetchInterval: 30_000,
  });
}

/**
 * Opens a real-time connection for new notifications, invalidating the
 * `useNotifications` query on each event rather than merging the pushed
 * payload into the cache directly — one source of truth (the real
 * `GET /notifications` response) instead of two representations that could
 * drift apart.
 */
export function useNotificationStream() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    // EventSource can't send custom headers, so the token travels as a
    // query param here instead of the Authorization header every other
    // request uses — see `requireAuthFromQuery` on the backend.
    const source = new EventSource(`${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`);
    source.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    // No explicit reconnect handling needed — EventSource retries
    // automatically on a dropped connection, and the poll above covers the
    // gap in the meantime.

    return () => source.close();
  }, [queryClient]);
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
