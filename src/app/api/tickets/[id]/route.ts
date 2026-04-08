// SPEC: tickets.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team, TicketStatus, TicketSize, Hub, TicketType, UserRole , Prisma } from "@prisma/client";
import { syncEpicStatus } from "@/lib/epic-status";
import { sendEmail, ticketAssignedEmail, ticketStatusChangedEmail } from "@/lib/mailer";
import { createNotifications } from "@/lib/notify-users";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  size: z.nativeEnum(TicketSize).nullable().optional(),
  priority: z.number().int().min(0).max(4).optional(),
  team: z.nativeEnum(Team).optional(),
  hub: z.nativeEnum(Hub).nullable().optional(),
  type: z.nativeEnum(TicketType).nullable().optional(),
  tier: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  epicId: z.string().nullable().optional(),
  // Accept both full ISO-8601 strings and bare YYYY-MM-DD date strings.
  // Prisma requires a Date object for DateTime fields — we coerce here so
  // that the DueDateField component can send "2026-03-25" without a 500.
  // Null/undefined pass through unchanged; empty string is treated as null.
  dueDate: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v) => v === undefined || v === null || v === "" || !isNaN(new Date(v).getTime()),
      { message: "Invalid date format" }
    )
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null || v === "") return null;
      return new Date(v);
    }),
  // SPEC: skillsets.md — link or clear the required skillset for this ticket
  requiredSkillsetId: z.string().nullable().optional(),
  // SPEC: sprints.md — per-ticket acceptance criteria / Definition of Done
  acceptanceCriteria: z.string().nullable().optional(),
  // SPEC: carryover — marks a ticket as carried over from the previous sprint
  isCarryover: z.boolean().optional(),
});

const ticketInclude = {
  assignee: { select: { id: true, name: true, email: true, team: true, role: true } },
  creator: { select: { id: true, name: true, email: true, team: true, role: true } },
  sprint: { select: { id: true, name: true } },
  epic: { select: { id: true, name: true, color: true } },
  template: { select: { id: true, name: true } },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ticket = await db.ticket.findUnique({ where: { id }, include: ticketInclude });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: ticket });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Fetch current ticket state before update — needed for status history, epic sync, email triggers, and audit logging
  const current = await db.ticket.findUnique({
    where: { id },
    select: {
      status: true,
      epicId: true,
      assigneeId: true,
      title: true,
      description: true,
      team: true,
      priority: true,
      size: true,
      sprintId: true,
      assignee: { select: { name: true } },
      sprint: { select: { name: true } },
    },
  });

  type TicketWithIncludes = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;
  let ticket: TicketWithIncludes;

  const statusChanged =
    parsed.data.status && current && current.status !== parsed.data.status;

  try {
    if (statusChanged) {
      const updatedTicket = await db.$transaction(async (tx) => {
        const t = await tx.ticket.update({
          where: { id },
          data: parsed.data,
          include: ticketInclude,
        });
        await tx.ticketStatusHistory.create({
          data: {
            ticketId: id,
            fromStatus: current!.status,
            toStatus: parsed.data.status!,
            changedById: session.user.id,
          },
        });
        return t;
      });
      ticket = updatedTicket as TicketWithIncludes;
    } else {
      ticket = await db.ticket.update({
        where: { id },
        data: parsed.data,
        include: ticketInclude,
      });
    }
  } catch (e) {
    console.error("[PATCH /api/tickets/:id] error:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }

  // Audit log — fire-and-forget field-change tracking.
  // Errors here must never fail the PATCH response.
  void (async () => {
    try {
      if (!current) return; // ticket didn't exist — nothing to diff

      const priorityLabel = (p: number) => {
        if (p === 1) return "Low";
        if (p === 2) return "Med";
        if (p === 3) return "High";
        if (p === 4) return "Urgent";
        return "No priority";
      };

      const auditEntries: Prisma.TicketAuditLogCreateManyInput[] = [];

      if (parsed.data.title !== undefined && parsed.data.title !== current.title) {
        auditEntries.push({
          ticketId: id,
          field: "title",
          oldValue: current.title,
          newValue: parsed.data.title,
          changedById: session.user.id,
        });
      }

      if (
        parsed.data.description !== undefined &&
        parsed.data.description !== current.description
      ) {
        auditEntries.push({
          ticketId: id,
          field: "description",
          oldValue: current.description ?? null,
          newValue: parsed.data.description ?? null,
          changedById: session.user.id,
        });
      }

      if (parsed.data.team !== undefined && parsed.data.team !== current.team) {
        auditEntries.push({
          ticketId: id,
          field: "team",
          oldValue: current.team,
          newValue: parsed.data.team,
          changedById: session.user.id,
        });
      }

      if (parsed.data.priority !== undefined && parsed.data.priority !== current.priority) {
        auditEntries.push({
          ticketId: id,
          field: "priority",
          oldValue: priorityLabel(current.priority),
          newValue: priorityLabel(parsed.data.priority),
          changedById: session.user.id,
        });
      }

      if (parsed.data.size !== undefined && parsed.data.size !== current.size) {
        auditEntries.push({
          ticketId: id,
          field: "size",
          oldValue: current.size ?? null,
          newValue: parsed.data.size ?? null,
          changedById: session.user.id,
        });
      }

      if (parsed.data.assigneeId !== undefined && parsed.data.assigneeId !== current.assigneeId) {
        // New assignee name — look up if we have a new assigneeId
        let newAssigneeName: string | null = null;
        if (parsed.data.assigneeId) {
          const newAssignee = await db.user.findUnique({
            where: { id: parsed.data.assigneeId },
            select: { name: true },
          });
          newAssigneeName = newAssignee?.name ?? parsed.data.assigneeId;
        }
        auditEntries.push({
          ticketId: id,
          field: "assigneeId",
          oldValue: current.assignee?.name ?? null,
          newValue: newAssigneeName,
          changedById: session.user.id,
        });
      }

      if (parsed.data.sprintId !== undefined && parsed.data.sprintId !== current.sprintId) {
        // New sprint name — look up if we have a new sprintId
        let newSprintName: string | null = null;
        if (parsed.data.sprintId) {
          const newSprint = await db.sprint.findUnique({
            where: { id: parsed.data.sprintId },
            select: { name: true },
          });
          newSprintName = newSprint?.name ?? parsed.data.sprintId;
        }
        auditEntries.push({
          ticketId: id,
          field: "sprintId",
          oldValue: current.sprint?.name ?? null,
          newValue: newSprintName,
          changedById: session.user.id,
        });
      }

      if (auditEntries.length > 0) {
        await db.ticketAuditLog.createMany({ data: auditEntries });
      }
    } catch (e) {
      console.error("[audit log] failed for ticket", id, e);
    }
  })();

  // Sync epic status if this ticket belongs to an epic.
  // These are fire-and-forget side effects — errors here must not fail the
  // primary PATCH response, which has already committed to the DB.
  const updatedEpicId = ticket.epic?.id ?? parsed.data.epicId ?? null;
  if (updatedEpicId) {
    syncEpicStatus(updatedEpicId).catch((e) =>
      console.error("[syncEpicStatus] failed for epic", updatedEpicId, e)
    );
  }
  // Also sync old epic if epicId changed
  if (
    parsed.data.epicId !== undefined &&
    current?.epicId &&
    current.epicId !== parsed.data.epicId
  ) {
    syncEpicStatus(current.epicId).catch((e) =>
      console.error("[syncEpicStatus] failed for old epic", current.epicId, e)
    );
  }

  // Email: assignee changed — notify the new assignee
  const assigneeChanged =
    parsed.data.assigneeId !== undefined &&
    parsed.data.assigneeId !== null &&
    parsed.data.assigneeId !== current?.assigneeId;

  if (assigneeChanged && ticket.assignee?.email) {
    void sendEmail(
      ticketAssignedEmail({
        to: ticket.assignee.email,
        assigneeName: ticket.assignee.name,
        ticketTitle: ticket.title,
        ticketId: ticket.id,
        appUrl: APP_URL,
      })
    );
  }

  // Email: status changed — notify the assignee (if any)
  if (statusChanged && ticket.assignee?.email) {
    void sendEmail(
      ticketStatusChangedEmail({
        to: ticket.assignee.email,
        userName: ticket.assignee.name,
        ticketTitle: ticket.title,
        ticketId: ticket.id,
        oldStatus: current!.status,
        newStatus: parsed.data.status!,
        appUrl: APP_URL,
      })
    );
  }

  // In-app notifications
  const notificationItems: { userId: string; message: string; link: string }[] = [];
  const ticketLink = `/tickets/${ticket.id}`;

  // Assignee changed — notify the new assignee (not if self-assignment)
  if (
    assigneeChanged &&
    ticket.assignee &&
    ticket.assignee.id !== session.user.id
  ) {
    notificationItems.push({
      userId: ticket.assignee.id,
      message: `You have been assigned to ticket: ${ticket.title}`,
      link: ticketLink,
    });
  }

  // Status → DONE — notify creator if different from actor
  if (
    statusChanged &&
    parsed.data.status === TicketStatus.DONE &&
    ticket.creator.id !== session.user.id
  ) {
    notificationItems.push({
      userId: ticket.creator.id,
      message: `Ticket '${ticket.title}' has been marked done`,
      link: ticketLink,
    });
  }

  // Status → BLOCKED — notify the assignee if different from actor
  if (
    statusChanged &&
    parsed.data.status === TicketStatus.BLOCKED &&
    ticket.assignee &&
    ticket.assignee.id !== session.user.id
  ) {
    notificationItems.push({
      userId: ticket.assignee.id,
      message: `Ticket '${ticket.title}' is now blocked`,
      link: ticketLink,
    });
  }

  if (notificationItems.length > 0) {
    void createNotifications(notificationItems);
  }

  return NextResponse.json({ data: ticket });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await db.ticket.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
