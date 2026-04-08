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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!isPrivileged(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Optional body: { targetSprintId: string | null }
  // When provided, non-done tickets are moved directly to that sprint instead of backlog.
  let targetSprintId: string | null = null;
  try {
    const body = await req.json() as { targetSprintId?: string | null };
    targetSprintId = body.targetSprintId ?? null;
  } catch {
    // Body is optional — missing or malformed body defaults to backlog
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
  // Use caller-provided targetSprintId if given; otherwise fall back to auto-detected next sprint
  const resolvedNextSprintId = targetSprintId ?? nextSprint?.id ?? null;

  try {
    await db.$transaction(async (tx) => {
      // 1. Create carryover suggestions for each non-done ticket
      for (const ticket of nonDoneTickets) {
        await tx.sprintCarryoverSuggestion.create({
          data: {
            ticketId: ticket.id,
            fromSprintId: id,
            toSprintId: resolvedNextSprintId,
            // Auto-accept when caller explicitly chose a target sprint
            status: targetSprintId ? "ACCEPTED" : "PENDING",
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

      // 3. Move non-done tickets to the chosen destination (sprint or backlog)
      if (nonDoneTickets.length > 0) {
        await tx.ticket.updateMany({
          where: {
            sprintId: id,
            status: { not: TicketStatus.DONE },
          },
          data: { sprintId: targetSprintId ?? null },
        });
      }
    });
  } catch (err) {
    console.error("[POST /api/sprints/[id]/close]", err);
    return NextResponse.json({ error: "Failed to close sprint" }, { status: 500 });
  }

  return NextResponse.json({ data: { carriedOver, nextSprintId: resolvedNextSprintId } });
}
