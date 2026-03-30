// SPEC: ai-copilot.md
import { db } from "@/lib/db";
import { SIZE_HOURS } from "@/lib/utils";
import { Team, type TicketSize, type TicketStatus } from "@prisma/client";
import type { SprintRow } from "./context-sprints";

export interface TeamCapacitySummary {
  team: Team;
  sprintId: string;
  sprintName: string;
  totalCapacity: number;
  committed: number;
  available: number;
  loadPct: number;
}

type SprintTicketRow = { team: Team; size: TicketSize | null; status: TicketStatus };

type SlimSprintRow = {
  id: string;
  name: string;
  tickets: SprintTicketRow[];
};

/**
 * Given the already-fetched active, upcoming, and recently-closed sprint rows,
 * fetch teamCapacity records and compute per-team, per-sprint capacity summaries.
 */
export async function buildTeamCapacity(
  activeSprintRaw: SprintRow | null,
  upcomingSprintsRaw: SprintRow[],
  recentlyClosedRaw: SprintRow[]
): Promise<TeamCapacitySummary[]> {
  const relevantSprintIds = [
    activeSprintRaw?.id,
    ...upcomingSprintsRaw.map((s) => s.id),
    ...recentlyClosedRaw.map((s) => s.id),
  ].filter((id): id is string => id !== undefined);

  const capacityRows = await db.teamCapacity.findMany({
    where: { sprintId: { in: relevantSprintIds } },
    select: {
      sprintId: true,
      points: true,
      user: { select: { team: true } },
      sprint: { select: { name: true } },
    },
  });

  const allSprintRows: SlimSprintRow[] = [
    ...(activeSprintRaw
      ? [{ id: activeSprintRaw.id, name: activeSprintRaw.name, tickets: activeSprintRaw.tickets }]
      : []),
    ...upcomingSprintsRaw.map((s) => ({ id: s.id, name: s.name, tickets: s.tickets })),
    ...recentlyClosedRaw.map((s) => ({ id: s.id, name: s.name, tickets: s.tickets })),
  ];

  const teams = Object.values(Team);
  const result: TeamCapacitySummary[] = [];

  for (const sprint of allSprintRows) {
    const sprintCapRows = capacityRows.filter((c) => c.sprintId === sprint.id);
    for (const team of teams) {
      const totalCapacity = sprintCapRows
        .filter((c) => c.user.team === team)
        .reduce((sum, c) => sum + c.points, 0);
      const committed = sprint.tickets
        .filter((t) => t.team === team)
        .reduce((sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0), 0);
      const available = totalCapacity - committed;
      const loadPct = totalCapacity > 0 ? Math.round((committed / totalCapacity) * 100) : 0;

      result.push({
        team,
        sprintId: sprint.id,
        sprintName: sprint.name,
        totalCapacity,
        committed,
        available,
        loadPct,
      });
    }
  }

  return result;
}
