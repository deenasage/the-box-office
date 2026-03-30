// SPEC: sprints.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { SIZE_HOURS } from "@/lib/utils";
import { Team, TicketStatus } from "@prisma/client";
import type { SprintReport, TeamReportRow } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const sprint = await db.sprint.findUnique({
    where: { id },
    include: { tickets: { select: { size: true, status: true, team: true } } },
  });

  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const teams = Object.values(Team);
  const teamBreakdown: TeamReportRow[] = teams.map((team) => {
    const teamTickets = sprint.tickets.filter((t) => t.team === team);
    const committed = teamTickets.reduce(
      (sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0),
      0
    );
    const completed = teamTickets
      .filter((t) => t.status === TicketStatus.DONE)
      .reduce((sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0), 0);
    return { team, committed, completed, ticketCount: teamTickets.length };
  });

  const totalCommitted = teamBreakdown.reduce((s, r) => s + r.committed, 0);
  const totalCompleted = teamBreakdown.reduce((s, r) => s + r.completed, 0);
  const velocity = totalCommitted > 0
    ? Math.round((totalCompleted / totalCommitted) * 100)
    : 0;

  const report: SprintReport = {
    sprintId: sprint.id,
    sprintName: sprint.name,
    totalCommitted,
    totalCompleted,
    velocity,
    teamBreakdown,
  };

  return NextResponse.json(report);
}
