// SPEC: tickets.md
// GET  /api/tickets/[id]/comments — Auth: any authenticated. Returns { data: Comment[] } ordered asc.
// POST /api/tickets/[id]/comments — Auth: any authenticated. Body: { body: string }. Returns { data: Comment } 201.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { sendEmail, ticketCommentEmail } from "@/lib/mailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true } });
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const comments = await db.comment.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: comments });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { id: true, title: true, assigneeId: true },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let comment: Awaited<ReturnType<typeof db.comment.create>>;

  try {
    // If the ticket has an assignee who is not the commenter, create a notification atomically
    if (ticket.assigneeId && ticket.assigneeId !== session.user.id) {
      comment = await db.$transaction(async (tx) => {
        const created = await tx.comment.create({
          data: {
            ticketId: id,
            authorId: session.user.id,
            body: parsed.data.body,
          },
          include: {
            author: { select: { id: true, name: true } },
          },
        });
        await tx.notification.create({
          data: {
            userId: ticket.assigneeId!,
            message: `${session.user.name ?? session.user.email ?? "Someone"} commented on: ${ticket.title}`,
            link: `/tickets/${id}`,
          },
        });
        return created;
      });

      // Email the assignee about the new comment — fetch their email outside the transaction
      const assignee = await db.user.findUnique({
        where: { id: ticket.assigneeId },
        select: { email: true, name: true },
      });
      if (assignee?.email) {
        void sendEmail(
          ticketCommentEmail({
            to: assignee.email,
            userName: assignee.name,
            commenterName: session.user.name ?? "Someone",
            ticketTitle: ticket.title,
            ticketId: id,
            commentBody: parsed.data.body,
            appUrl: APP_URL,
          })
        );
      }
    } else {
      comment = await db.comment.create({
        data: {
          ticketId: id,
          authorId: session.user.id,
          body: parsed.data.body,
        },
        include: {
          author: { select: { id: true, name: true } },
        },
      });
    }
  } catch (err) {
    console.error("[POST /api/tickets/[id]/comments]", err);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }

  // Audit log + touch updatedAt — awaited so entries are guaranteed to persist
  try {
    await db.ticketAuditLog.create({
      data: {
        ticketId: id,
        field: "comment_added",
        oldValue: null,
        newValue: parsed.data.body,
        changedById: session.user.id,
      },
    });
    await db.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
  } catch { /* never fail the response */ }

  // Parse @mention notifications (fire-and-forget — never block the response)
  void (async () => {
    try {
      const mentionMatches = [...parsed.data.body.matchAll(/@(\w+)/g)];
      if (mentionMatches.length === 0) return;

      const mentions = [...new Set(mentionMatches.map((m) => m[1]))];
      const mentionedUsers = await db.user.findMany({
        where: {
          name: { in: mentions },
          id: { not: session.user.id }, // skip self-mentions
        },
        select: { id: true },
      });

      if (mentionedUsers.length === 0) return;

      const authorName = session.user.name ?? session.user.email ?? "Someone";
      await db.notification.createMany({
        data: mentionedUsers.map((u) => ({
          userId: u.id,
          message: `${authorName} mentioned you in a comment on: ${ticket.title}`,
          link: `/tickets/${id}`,
        })),
      });
    } catch (err) {
      console.error("[comments] @mention notification error:", err);
    }
  })();

  return NextResponse.json({ data: comment }, { status: 201 });
}
