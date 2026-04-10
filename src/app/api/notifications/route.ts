// SPEC: tickets.md
// GET /api/notifications — Auth: any authenticated.
// Returns unread notifications for the current user.
// Response: { data: Notification[], unreadCount: number }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ data: notifications, unreadCount: notifications.length });
}
