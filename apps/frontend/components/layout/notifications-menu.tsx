"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarkNotificationRead, useNotifications, useNotificationStream } from "@/features/notifications/useNotifications";

export function NotificationsMenu() {
  const { data: notifications } = useNotifications();
  const markAsRead = useMarkNotificationRead();
  useNotificationStream();
  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="relative">
            <Bell />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex size-2 rounded-full bg-destructive" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(notifications ?? []).length === 0 && (
            <p className="px-1.5 py-2 text-sm text-muted-foreground">No notifications yet.</p>
          )}
          {(notifications ?? []).slice(0, 10).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start gap-0.5 whitespace-normal"
              onClick={() => !notification.isRead && markAsRead.mutate(notification.id)}
            >
              <span className={notification.isRead ? "text-muted-foreground" : "font-medium"}>
                {notification.title}
              </span>
              <span className="text-xs text-muted-foreground">{notification.message}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
