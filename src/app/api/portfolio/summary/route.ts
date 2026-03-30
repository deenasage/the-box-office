// SPEC: portfolio-view.md
// GET /api/portfolio/summary — Any authenticated user
// Returns leadership summary: status counts, team load (active sprint), upcoming delivery, at-risk epics.
// Response: { data: PortfolioSummary }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { Team, EpicStatus, TicketStatus, DependencyType } from "@prisma/client";
import { SIZE_HOURS } from "@/lib/utils";
import { detectSequencingWarnings } from "@/lib/dependencies";

interface ByStatus { status: EpicStatus; count: number }
interface TeamLoad { team: Team; capacity: number; committed: number }
interface UpcomingDelivery { epicId: string; epicName: string; endDate: string; completionPct: number }
interface AtRisk { epicId: string; epicName: string; warningCount: number }
interface PortfolioSummary { byStatus: ByStatus[]; teamLoad: TeamLoad[]; upcomingDelivery: UpcomingDelivery[]; atRisk: AtRisk[] }

async function getByStatus(): Promise<ByStatus[]> {
  const groups = await db.epic.groupBy({ by: ["status"], _count: { status: true } });
  const countMap = new Map(groups.map((g) => [g.status, g._count.status]));
  return Object.values(EpicStatus).map((s) => ({ status: s, count: countMap.get(s) ?? 0 }));
}

async function getTeamLoad(): Promise<TeamLoad[]> {
  const activeSprint = await db.sprint.findFirst({
    where: { isActive: true },
    include: {
      capacities: { include: { user: { select: { team: true } } } },
      tickets: { select: { team: true, size: true } },
    },
  });

  if (!activeSprint) return [];

  const capacityByTeam = new Map<Team, number>();
  for (const cap of activeSprint.capacities) {
    if (cap.user.team) {
      capacityByTeam.set(cap.user.team, (capacityByTeam.get(cap.user.team) ?? 0) + cap.points);
    }
  }

  const committedByTeam = new Map<Team, number>();
  for (const ticket of activeSprint.tickets) {
    const pts = ticket.size ? SIZE_HOURS[ticket.size] : 0;
    committedByTeam.set(ticket.team, (committedByTeam.get(ticket.team) ?? 0) + pts);
  }

  const allTeams = new Set<Team>([...capacityByTeam.keys(), ...committedByTeam.keys()]);
  return Array.from(allTeams).map((team) => ({
    team,
    capacity: capacityByTeam.get(team) ?? 0,
    committed: committedByTeam.get(team) ?? 0,
  }));
}

async function getUpcomingDeliveries(): Promise<UpcomingDelivery[]> {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const epics = await db.epic.findMany({
    where: { endDate: { gte: now, lte: in30Days }, status: { notIn: [EpicStatus.CANCELLED, EpicStatus.DONE] } },
    include: { tickets: { select: { status: true } } },
    orderBy: { endDate: "asc" },
  });

  return epics.map((epic) => {
    const total = epic.tickets.length;
    const done = epic.tickets.filter((t) => t.status === TicketStatus.DONE).length;
    return {
      epicId: epic.id,
      epicName: epic.name,
      endDate: epic.endDate!.toISOString(),
      completionPct: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  });
}

async function getAtRiskEpics(): Promise<AtRisk[]> {
  const blocksDeps = await db.ticketDependency.findMany({
    where: { type: DependencyType.BLOCKS },
    select: {
      fromTicketId: true,
      toTicketId: true,
      type: true,
      fromTicket: { select: { id: true, title: true, sprintId: true, epicId: true, sprint: { select: { name: true, startDate: true } } } },
      toTicket: { select: { id: true, title: true, sprintId: true, epicId: true, sprint: { select: { name: true, startDate: true } } } },
    },
  });

  const ticketMap = new Map<string, { id: string; title: string; sprintId: string | null; sprintName: string | null; sprintStartDate: Date | null }>();
  for (const dep of blocksDeps) {
    for (const t of [dep.fromTicket, dep.toTicket]) {
      ticketMap.set(t.id, { id: t.id, title: t.title, sprintId: t.sprintId, sprintName: t.sprint?.name ?? null, sprintStartDate: t.sprint?.startDate ?? null });
    }
  }

  const warnings = detectSequencingWarnings(
    blocksDeps.map((d) => ({ fromTicketId: d.fromTicketId, toTicketId: d.toTicketId, type: d.type })),
    ticketMap
  );

  const epicWarningCount = new Map<string, number>();
  for (const warning of warnings) {
    const dep = blocksDeps.find((d) => d.fromTicketId === warning.blockerId);
    const epicId = dep?.fromTicket.epicId ?? dep?.toTicket.epicId ?? null;
    if (epicId) epicWarningCount.set(epicId, (epicWarningCount.get(epicId) ?? 0) + 1);
  }

  const atRiskEpicIds = Array.from(epicWarningCount.keys());
  if (atRiskEpicIds.length === 0) return [];

  const epics = await db.epic.findMany({ where: { id: { in: atRiskEpicIds } }, select: { id: true, name: true } });
  const epicNameMap = new Map(epics.map((e) => [e.id, e.name]));

  return atRiskEpicIds
    .map((epicId) => ({ epicId, epicName: epicNameMap.get(epicId) ?? "Unknown", warningCount: epicWarningCount.get(epicId) ?? 0 }))
    .sort((a, b) => b.warningCount - a.warningCount);
}

export async function GET(_req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const [byStatus, teamLoad, upcomingDelivery, atRisk] = await Promise.all([
    getByStatus(),
    getTeamLoad(),
    getUpcomingDeliveries(),
    getAtRiskEpics(),
  ]);

  const summary: PortfolioSummary = { byStatus, teamLoad, upcomingDelivery, atRisk };
  return NextResponse.json({ data: summary });
}
