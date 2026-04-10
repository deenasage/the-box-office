// SPEC: portfolio-view.md
// GET /api/portfolio/[epicId] — Any authenticated user
// Returns full initiative detail: epic, briefs, tickets grouped by team, sprint timeline.
// Response: { data: PortfolioDetail }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { Team, TicketStatus, TicketSize, BriefStatus, EpicStatus } from "@prisma/client";
import { SIZE_HOURS } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface TicketRow {
  id: string;
  title: string;
  status: TicketStatus;
  size: TicketSize | null;
  sprintId: string | null;
  sprintName: string | null;
  assigneeName: string | null;
  briefId: string | null;
}

interface TicketsByTeam {
  team: Team;
  tickets: TicketRow[];
  committedPoints: number;
  completedPoints: number;
}

interface PortfolioDetail {
  epic: {
    id: string;
    name: string;
    description: string | null;
    team: Team | null;
    status: EpicStatus;
    color: string;
    startDate: string | null;
    endDate: string | null;
  };
  briefs: Array<{
    id: string;
    title: string;
    status: BriefStatus;
    createdAt: string;
    creatorName: string;
  }>;
  ticketsByTeam: TicketsByTeam[];
  timeline: {
    earliestSprintStart: string | null;
    latestSprintEnd: string | null;
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ epicId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { epicId } = await params;

  const epic = await db.epic.findUnique({
    where: { id: epicId },
    include: {
      briefs: {
        include: {
          creator: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      tickets: {
        select: {
          id: true,
          title: true,
          status: true,
          size: true,
          team: true,
          sprintId: true,
          briefId: true,
          sprint: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          assignee: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!epic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Group tickets by team
  const teamMap = new Map<Team, TicketRow[]>();
  for (const ticket of epic.tickets) {
    const rows = teamMap.get(ticket.team) ?? [];
    rows.push({
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      size: ticket.size,
      sprintId: ticket.sprintId,
      sprintName: ticket.sprint?.name ?? null,
      assigneeName: ticket.assignee?.name ?? null,
      briefId: ticket.briefId ?? null,
    });
    teamMap.set(ticket.team, rows);
  }

  const ticketsByTeam: TicketsByTeam[] = Array.from(teamMap.entries()).map(
    ([team, tickets]) => {
      const committedPoints = tickets.reduce(
        (sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0),
        0
      );
      const completedPoints = tickets
        .filter((t) => t.status === TicketStatus.DONE)
        .reduce((sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0), 0);
      return { team, tickets, committedPoints, completedPoints };
    }
  );

  // Compute sprint timeline bounds from all sprint start/end dates
  const ticketsWithSprint = epic.tickets.filter(
    (t): t is typeof t & { sprint: NonNullable<(typeof t)["sprint"]> } =>
      t.sprint !== null
  );
  const startDates = ticketsWithSprint.map((t) => t.sprint.startDate.getTime());
  const endDates = ticketsWithSprint.map((t) => t.sprint.endDate.getTime());

  const earliestSprintStart =
    startDates.length > 0
      ? new Date(Math.min(...startDates)).toISOString()
      : null;
  const latestSprintEnd =
    endDates.length > 0
      ? new Date(Math.max(...endDates)).toISOString()
      : null;

  const detail: PortfolioDetail = {
    epic: {
      id: epic.id,
      name: epic.name,
      description: epic.description,
      team: epic.team,
      status: epic.status,
      color: epic.color,
      startDate: epic.startDate ? epic.startDate.toISOString() : null,
      endDate: epic.endDate ? epic.endDate.toISOString() : null,
    },
    briefs: epic.briefs.map((b) => ({
      id: b.id,
      title: b.title,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      creatorName: b.creator.name,
    })),
    ticketsByTeam,
    timeline: { earliestSprintStart, latestSprintEnd },
  };

  return NextResponse.json({ data: detail });
}
