// SPEC: tickets.md
// PATCH /api/notifications/[id]/read — Auth: any authenticated, ownership required.
// Marks a single notification as read.
// Response: { data: Notification }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const notification = await db.notification.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (notification.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updated = await db.notification.update({
      where: { id },
      data: { read: true },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
