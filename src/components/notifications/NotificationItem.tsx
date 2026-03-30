// SPEC: tickets.md
"use client";

import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

export interface NotificationData {
  id: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const router = useRouter();
  const relativeTime = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  function handleClick() {
    onMarkRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
    >
      <p className="text-sm leading-snug">{notification.message}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{relativeTime}</p>
    </button>
  );
}
