// SPEC: auto-assign.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { UserRole, TicketStatus } from "@prisma/client";

const commitAssignmentSchema = z.object({
  ticketId: z.string().min(1),
  assigneeId: z.string().nullable(),
  sprintId: z.string().min(1),
});

const commitSchema = z.object({
  assignments: z
    .array(commitAssignmentSchema)
    .min(1, "assignments must not be empty"),
});

// POST /api/tickets/auto-assign/commit
// Auth: ADMIN or TEAM_LEAD
// Body: { assignments: Array<{ ticketId, assigneeId, sprintId }> }
// Applies each assignment inside a single Prisma transaction.
// If a ticket's current status is BACKLOG, it is promoted to TODO and a
// TicketStatusHistory record is written. Partial failure is surfaced via
// the errors array — the rest of the batch still commits.
// Response 200: { data: { updatedCount: number, errors: { ticketId, message }[] } }
// Response 400: validation failure or empty assignments
// Response 403: insufficient role
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session.user.role;
  if (role !== UserRole.ADMIN && !isTeamLead(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = commitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { assignments } = parsed.data;
  const changedById = session.user.id;

  // Fetch current ticket statuses in one query to determine which need a
  // status history record. This avoids N queries inside the transaction.
  const ticketIds = assignments.map((a) => a.ticketId);
  const currentTickets = await db.ticket.findMany({
    where: { id: { in: ticketIds } },
    select: { id: true, status: true, title: true },
  });
  const ticketById = new Map(
    currentTickets.map((t) => [t.id, t])
  );
  const statusByTicketId = new Map(
    currentTickets.map((t) => [t.id, t.status])
  );

  const errors: { ticketId: string; message: string }[] = [];
  let updatedCount = 0;

  // Process each assignment individually inside a single transaction.
  // Using individual update calls (not updateMany) so we can write
  // TicketStatusHistory records per ticket atomically.
  // Per the spec: partial failure is acceptable — failed tickets are added
  // to errors and the rest still commit.
  for (const assignment of assignments) {
    const { ticketId, assigneeId, sprintId } = assignment;
    const currentStatus = statusByTicketId.get(ticketId);

    const shouldPromote = currentStatus === TicketStatus.BACKLOG;
    const newStatus = shouldPromote ? TicketStatus.TODO : undefined;

    try {
      await db.$transaction(async (tx) => {
        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            sprintId,
            assigneeId: assigneeId ?? null,
            ...(newStatus ? { status: newStatus } : {}),
          },
        });

        if (shouldPromote && newStatus) {
          await tx.ticketStatusHistory.create({
            data: {
              ticketId,
              fromStatus: TicketStatus.BACKLOG,
              toStatus: newStatus,
              changedById,
            },
          });
        }

        if (assigneeId) {
          const ticketTitle = ticketById.get(ticketId)?.title ?? ticketId;
          await tx.notification.create({
            data: {
              userId: assigneeId,
              message: `You've been assigned to "${ticketTitle}"`,
              read: false,
            },
          });
        }
      });

      updatedCount++;
    } catch (err) {
      console.error(`[POST /api/tickets/auto-assign/commit] ticketId=${ticketId}`, err);
      errors.push({ ticketId, message: "Failed to update ticket" });
    }
  }

  return NextResponse.json({
    data: {
      updatedCount,
      errors,
    },
  });
}
