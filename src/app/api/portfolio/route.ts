// SPEC: portfolio-view.md
// GET /api/portfolio — Any authenticated user
// Query params: team (Team), status (comma-separated EpicStatus), sprintId, page (default 1), limit (default 30, max 100)
// Response: PortfolioListResponse

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { Team, EpicStatus, TicketStatus, BriefStatus, UserRole, Prisma } from "@prisma/client";

interface PortfolioListItem {
  epicId: string;
  epicName: string;
  epicTeam: Team | null;
  epicStatus: EpicStatus;
  epicStartDate: string | null;
  epicEndDate: string | null;
  activeBriefStatus: BriefStatus | null;
  ticketCounts: {
    total: number;
    done: number;
    inProgress: number;
    backlog: number;
  };
  completionPct: number;
  sprints: string[];
  teams: Team[];
}

interface PortfolioListResponse {
  data: PortfolioListItem[];
  total: number;
  inProgressTotal: number;
  completedTotal: number;
  page: number;
  limit: number;
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;

  const teamParam = searchParams.get("team");
  const statusParam = searchParams.get("status");
  const sprintId = searchParams.get("sprintId");
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? "30", 10) || 30));

  // Validate team filter
  let teamFilter: Team | undefined;
  if (teamParam) {
    if (!Object.values(Team).includes(teamParam as Team)) {
      return NextResponse.json({ error: "Invalid team value" }, { status: 400 });
    }
    teamFilter = teamParam as Team;
  }

  // Validate status filter — comma-separated list
  let statusFilter: EpicStatus[] | undefined;
  if (statusParam) {
    const parts = statusParam.split(",").map((s) => s.trim());
    for (const p of parts) {
      if (!Object.values(EpicStatus).includes(p as EpicStatus)) {
        return NextResponse.json({ error: `Invalid status value: ${p}` }, { status: 400 });
      }
    }
    statusFilter = parts as EpicStatus[];
  }

  // MEMBER role: only sees epics for their team or unassigned epics
  const isMember =
    session.user.role === UserRole.MEMBER_CRAFT && session.user.team;

  // Build Prisma where clause
  const where: Prisma.EpicWhereInput = {};

  if (statusFilter) {
    where.status = { in: statusFilter };
  }

  if (sprintId) {
    where.tickets = { some: { sprintId } };
  }

  if (teamFilter) {
    where.OR = [
      { team: teamFilter },
      { tickets: { some: { team: teamFilter } } },
    ];
  } else if (isMember) {
    where.OR = [{ team: session.user.team as Team }, { team: null }];
  }

  const [epics, total, inProgressTotal, completedTotal] = await Promise.all([
    db.epic.findMany({
      where,
      include: {
        tickets: {
          select: {
            id: true,
            status: true,
            team: true,
            size: true,
            sprintId: true,
            sprint: { select: { name: true } },
          },
        },
        briefs: {
          select: { status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.epic.count({ where }),
    db.epic.count({ where: { ...where, status: EpicStatus.IN_PROGRESS } }),
    db.epic.count({ where: { ...where, status: EpicStatus.DONE } }),
  ]);

  const data: PortfolioListItem[] = epics.map((epic) => {
    const tickets = epic.tickets;
    const total = tickets.length;
    const done = tickets.filter((t) => t.status === TicketStatus.DONE).length;
    const inProgress = tickets.filter(
      (t) =>
        t.status === TicketStatus.IN_PROGRESS ||
        t.status === TicketStatus.IN_REVIEW
    ).length;
    const backlog = tickets.filter(
      (t) =>
        t.status === TicketStatus.BACKLOG || t.status === TicketStatus.TODO
    ).length;
    const completionPct = total === 0 ? 0 : Math.round((done / total) * 100);

    const sprintNames = Array.from(
      new Set(
        tickets
          .filter((t) => t.sprint?.name)
          .map((t) => t.sprint!.name)
      )
    );

    const teams = Array.from(new Set(tickets.map((t) => t.team)));

    const activeBriefStatus = epic.briefs[0]?.status ?? null;

    return {
      epicId: epic.id,
      epicName: epic.name,
      epicTeam: epic.team,
      epicStatus: epic.status,
      epicStartDate: epic.startDate ? epic.startDate.toISOString() : null,
      epicEndDate: epic.endDate ? epic.endDate.toISOString() : null,
      activeBriefStatus,
      ticketCounts: { total, done, inProgress, backlog },
      completionPct,
      sprints: sprintNames,
      teams,
    };
  });

  const response: PortfolioListResponse = { data, total, inProgressTotal, completedTotal, page, limit };
  return NextResponse.json(response);
}
