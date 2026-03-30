// SPEC: tickets.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationItem, type NotificationData } from "./NotificationItem";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = (await res.json()) as {
        data: NotificationData[];
        unreadCount: number;
      };
      setNotifications(json.data);
      setUnreadCount(json.unreadCount);
    } catch {
      // fail silently — bell is non-critical
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function markRead(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      void fetchNotifications();
    }
  }

  async function markAllRead() {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      void fetchNotifications();
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative p-2 rounded-md hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <NotificationList
          notifications={notifications}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      </PopoverContent>
    </Popover>
  );
}

interface NotificationListProps {
  notifications: NotificationData[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

function NotificationList({ notifications, onMarkRead, onMarkAllRead }: NotificationListProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-semibold">Notifications</span>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onMarkAllRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground text-center">
          You&apos;re all caught up.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5 p-1 max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} />
          ))}
        </div>
      )}
    </div>
  );
}
