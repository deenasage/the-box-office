// SPEC: tickets.md
// POST /api/notifications/read-all — Auth: any authenticated.
// Marks all unread notifications as read for the current user.
// Response: { data: { count: number } }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const result = await db.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ data: { count: result.count } });
}
