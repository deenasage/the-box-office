// SPEC: tickets.md
// PATCH  /api/tickets/[id]/time-logs/[logId] — Auth: log owner or ADMIN. Returns 200 { data }.
// DELETE /api/tickets/[id]/time-logs/[logId] — Auth: log owner or ADMIN. Returns 204.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole , Prisma } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, logId } = await params;

  const timeLog = await db.timeLog.findUnique({
    where: { id: logId },
    select: { id: true, ticketId: true, userId: true },
  });

  if (!timeLog) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (timeLog.ticketId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = timeLog.userId === session.user.id;
  const isAdmin = session.user.role === UserRole.ADMIN;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const hours = typeof payload.hours === "number" ? payload.hours : parseFloat(String(payload.hours));
  const note = typeof payload.note === "string" ? payload.note.trim() || null : undefined;

  if (isNaN(hours) || hours < 0.25 || hours > 24) {
    return NextResponse.json(
      { error: "Hours must be between 0.25 and 24." },
      { status: 400 }
    );
  }

  try {
    const updated = await db.timeLog.update({
      where: { id: logId },
      data: {
        hours,
        ...(note !== undefined ? { note } : {}),
      },
      select: {
        id: true,
        ticketId: true,
        userId: true,
        hours: true,
        note: true,
        loggedAt: true,
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update time log" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, logId } = await params;

  const timeLog = await db.timeLog.findUnique({
    where: { id: logId },
    select: { id: true, ticketId: true, userId: true },
  });

  if (!timeLog) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (timeLog.ticketId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = timeLog.userId === session.user.id;
  const isAdmin = session.user.role === UserRole.ADMIN;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await db.timeLog.delete({ where: { id: logId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete time log" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
