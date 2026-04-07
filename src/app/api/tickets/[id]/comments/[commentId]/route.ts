// SPEC: tickets.md
// PATCH  /api/tickets/[id]/comments/[commentId] — Auth: comment author or ADMIN. Returns 200 { data }.
// DELETE /api/tickets/[id]/comments/[commentId] — Auth: comment author or ADMIN. Returns 204.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole , Prisma } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, commentId } = await params;

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, ticketId: true, authorId: true },
  });

  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.ticketId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = comment.authorId === session.user.id;
  const isAdmin = session.user.role === UserRole.ADMIN;
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newBody =
    typeof (body as Record<string, unknown>).body === "string"
      ? ((body as Record<string, unknown>).body as string).trim()
      : null;

  if (!newBody) {
    return NextResponse.json({ error: "Comment body must not be empty." }, { status: 400 });
  }

  try {
    const existing = await db.comment.findUnique({
      where: { id: commentId },
      select: { body: true },
    });

    const updated = await db.comment.update({
      where: { id: commentId },
      data: { body: newBody },
      select: {
        id: true,
        body: true,
        createdAt: true,
        authorId: true,
        author: { select: { id: true, name: true } },
      },
    });

    // Audit log + updatedAt touch — awaited so entries are guaranteed to persist
    try {
      await db.ticketAuditLog.create({
        data: {
          ticketId: id,
          field: "comment_edited",
          oldValue: existing?.body ?? null,
          newValue: newBody,
          changedById: session.user.id,
        },
      });
      await db.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
    } catch { /* never fail the response */ }

    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, commentId } = await params;

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, ticketId: true, authorId: true },
  });

  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.ticketId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = comment.authorId === session.user.id;
  const isAdmin = session.user.role === UserRole.ADMIN;
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await db.comment.findUnique({
      where: { id: commentId },
      select: { body: true },
    });

    await db.comment.delete({ where: { id: commentId } });

    // Audit log + updatedAt touch — awaited so entries are guaranteed to persist
    try {
      await db.ticketAuditLog.create({
        data: {
          ticketId: id,
          field: "comment_deleted",
          oldValue: existing?.body ?? null,
          newValue: null,
          changedById: session.user.id,
        },
      });
      await db.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
    } catch { /* never fail the response */ }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
