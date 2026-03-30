// SPEC: sprint-scrum.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { SIZE_HOURS } from "@/lib/utils";
import { TicketStatus } from "@prisma/client";

interface BurndownDay {
  date: string;
  remaining: number;
  ideal: number;
}

interface IdealLinePoint {
  date: string;
  hours: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  let sprint;
  try {
    sprint = await db.sprint.findUnique({
      where: { id },
      include: {
        tickets: {
          select: {
            id: true,
            size: true,
            createdAt: true,
            statusHistory: {
              where: { toStatus: TicketStatus.DONE },
              select: { changedAt: true },
              orderBy: { changedAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const start = sprint.startDate;
  const end = sprint.endDate;
  const today = new Date();

  // currentScope = all tickets in the sprint
  // originalScope = tickets whose createdAt <= sprint.startDate (proxy for
  // "was committed to this sprint when it kicked off")
  const originalScopeTickets = sprint.tickets.filter(
    (t) => t.createdAt <= start
  );
  const currentScopeTickets = sprint.tickets;

  const originalScopeHours = originalScopeTickets.reduce(
    (sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0),
    0
  );
  const currentScopeHours = currentScopeTickets.reduce(
    (sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0),
    0
  );
  const scopeAdded = currentScopeHours > originalScopeHours;

  // Number of calendar days in the sprint (inclusive of start and end)
  const sprintMs = end.getTime() - start.getTime();
  const sprintDays = Math.max(1, Math.ceil(sprintMs / 86_400_000));

  // Build a map: ISO date string → hours completed on that day (all current-scope tickets)
  const completionByDate = new Map<string, number>();
  for (const ticket of currentScopeTickets) {
    if (!ticket.size) continue;
    const doneAt = ticket.statusHistory[0]?.changedAt;
    if (!doneAt) continue;
    // Only count completions within the sprint window
    if (doneAt < start || doneAt > end) continue;
    const dateKey = doneAt.toISOString().split("T")[0];
    completionByDate.set(
      dateKey,
      (completionByDate.get(dateKey) ?? 0) + SIZE_HOURS[ticket.size]
    );
  }

  // totalHours for the existing 'ideal' field uses current scope (backward compat)
  const totalHours = currentScopeHours;

  const days: BurndownDay[] = [];
  const originalIdealLine: IdealLinePoint[] = [];
  let remaining = totalHours;

  for (let i = 0; i <= sprintDays; i++) {
    const dayMs = start.getTime() + i * 86_400_000;
    const date = new Date(dayMs);
    const dateStr = date.toISOString().split("T")[0];

    // Ideal based on current scope (backward compat)
    const ideal = Math.round(totalHours * (1 - i / sprintDays));

    // Original-scope ideal line: linear from originalScopeHours → 0
    const originalIdeal = Math.round(originalScopeHours * (1 - i / sprintDays));
    originalIdealLine.push({ date: dateStr, hours: originalIdeal });

    // Actual: subtract any completions on this day
    if (date <= today) {
      remaining -= completionByDate.get(dateStr) ?? 0;
    }

    days.push({
      date: dateStr,
      remaining: date <= today ? remaining : -1, // -1 = future, not plotted
      ideal,
    });
  }

  return NextResponse.json({
    days,
    totalHours,
    sprintDays,
    originalScopeHours,
    currentScopeHours,
    scopeAdded,
    originalIdealLine,
  });
}
