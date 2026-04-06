// SPEC: brief-to-epic-workflow.md
// POST /api/sprints/[id]/close — ADMIN or TEAM_LEAD only
// Closes a sprint:
//   1. Creates SprintCarryoverSuggestion records for every non-DONE ticket
//   2. Marks the sprint isActive: false (and endDate: now() if currently in the future)
//   3. Moves all non-DONE tickets to the backlog (sprintId: null)
// Identifies the next sprint (earliest future sprint that is not yet active) as the
// default carryover destination. toSprintId is null when no suitable next sprint exists.
// Response: { data: { carriedOver: number, nextSprintId: string | null } }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { UserRole, TicketStatus } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    !isPrivileged(session.user.role as UserRole)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const sprint = await db.sprint.findUnique({
    where: { id },
    include: {
      tickets: {
        where: { status: { not: TicketStatus.DONE } },
        select: { id: true },
      },
    },
  });

  if (!sprint) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }

  // Find the earliest future sprint that is not yet active — used as the suggested
  // destination for carried-over tickets. Optional: stays null if none found.
  const nextSprint = await db.sprint.findFirst({
    where: {
      startDate: { gt: sprint.endDate },
      isActive: false,
      id: { not: id },
    },
    orderBy: { startDate: "asc" },
    select: { id: true },
  });

  const nonDoneTickets = sprint.tickets;
  const carriedOver = nonDoneTickets.length;
  const nextSprintId = nextSprint?.id ?? null;

  try {
    await db.$transaction(async (tx) => {
      // 1. Create carryover suggestions for each non-done ticket
      for (const ticket of nonDoneTickets) {
        await tx.sprintCarryoverSuggestion.create({
          data: {
            ticketId: ticket.id,
            fromSprintId: id,
            toSprintId: nextSprintId,
            status: "PENDING",
          },
        });
      }

      // 2. Mark sprint as closed; only update endDate if it is still in the future
      const now = new Date();
      await tx.sprint.update({
        where: { id },
        data: {
          isActive: false,
          ...(sprint.endDate > now ? { endDate: now } : {}),
        },
      });

      // 3. Move non-done tickets back to backlog
      if (nonDoneTickets.length > 0) {
        await tx.ticket.updateMany({
          where: {
            sprintId: id,
            status: { not: TicketStatus.DONE },
          },
          data: { sprintId: null },
        });
      }
    });
  } catch (err) {
    console.error("[POST /api/sprints/[id]/close]", err);
    return NextResponse.json({ error: "Failed to close sprint" }, { status: 500 });
  }

  return NextResponse.json({ data: { carriedOver, nextSprintId } });
}
