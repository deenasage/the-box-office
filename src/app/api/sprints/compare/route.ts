// SPEC: sprint-scrum.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { SIZE_HOURS } from "@/lib/utils";
import { Team, TicketStatus } from "@prisma/client";

export interface SprintCompareSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  committedHours: number;
  completedHours: number;
  completionRate: number;
  ticketCount: number;
  doneCount: number;
  teamBreakdown: { team: string; total: number; done: number }[];
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const idsParam = req.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ error: "ids query param required" }, { status: 400 });
  }

  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5); // enforce max 5

  if (ids.length < 1) {
    return NextResponse.json({ error: "At least 1 sprint id required" }, { status: 400 });
  }

  const sprints = await db.sprint.findMany({
    where: { id: { in: ids } },
    include: {
      tickets: {
        select: { size: true, status: true, team: true },
      },
    },
    orderBy: { startDate: "asc" },
  });

  const teams = Object.values(Team);

  const summaries: SprintCompareSummary[] = sprints.map((sprint) => {
    const committedHours = sprint.tickets.reduce(
      (sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0),
      0
    );
    const doneTickets = sprint.tickets.filter((t) => t.status === TicketStatus.DONE);
    const completedHours = doneTickets.reduce(
      (sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0),
      0
    );
    const completionRate =
      committedHours > 0 ? Math.round((completedHours / committedHours) * 100) : 0;

    const teamBreakdown = teams
      .map((team) => {
        const teamTickets = sprint.tickets.filter((t) => t.team === team);
        const done = teamTickets.filter((t) => t.status === TicketStatus.DONE).length;
        return { team: team as string, total: teamTickets.length, done };
      })
      .filter((tb) => tb.total > 0);

    return {
      id: sprint.id,
      name: sprint.name,
      startDate: sprint.startDate.toISOString(),
      endDate: sprint.endDate.toISOString(),
      isActive: sprint.isActive,
      committedHours,
      completedHours,
      completionRate,
      ticketCount: sprint.tickets.length,
      doneCount: doneTickets.length,
      teamBreakdown,
    };
  });

  return NextResponse.json({ data: summaries });
}
