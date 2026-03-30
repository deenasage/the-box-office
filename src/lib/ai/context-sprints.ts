// SPEC: ai-copilot.md
import { db } from "@/lib/db";
import { SIZE_HOURS } from "@/lib/utils";
import { Team, TicketStatus, type TicketSize } from "@prisma/client";

export interface SprintSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  committedPoints: number;
  completedPoints: number;
  teamBreakdowns: { team: Team; committed: number; capacity: number }[];
}

/** Convert a Date to ISO string safely */
export function toISO(d: Date): string {
  return d.toISOString();
}

// The Prisma include shape used for all sprint fetches
export const SPRINT_INCLUDE = {
  tickets: {
    select: { team: true, size: true, status: true },
  },
  capacities: {
    select: { points: true, user: { select: { team: true } } },
  },
} as const;

export type SprintRow = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  tickets: Array<{ team: Team; size: TicketSize | null; status: TicketStatus }>;
  capacities: Array<{ points: number; user: { team: Team | null } }>;
};

/** Shape a raw Prisma sprint row into a SprintSummary */
export function buildSprintSummary(sprint: SprintRow): SprintSummary {
  const teams = Object.values(Team);

  const committedPoints = sprint.tickets.reduce(
    (sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0),
    0
  );

  const completedPoints = sprint.tickets
    .filter((t) => t.status === TicketStatus.DONE)
    .reduce((sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0), 0);

  const teamBreakdowns = teams.map((team) => {
    const committed = sprint.tickets
      .filter((t) => t.team === team)
      .reduce((sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0), 0);
    const capacity = sprint.capacities
      .filter((c) => c.user.team === team)
      .reduce((sum, c) => sum + c.points, 0);
    return { team, committed, capacity };
  });

  return {
    id: sprint.id,
    name: sprint.name,
    startDate: toISO(sprint.startDate),
    endDate: toISO(sprint.endDate),
    isActive: sprint.isActive,
    committedPoints,
    completedPoints,
    teamBreakdowns,
  };
}

export interface SprintContext {
  activeSprintRaw: SprintRow | null;
  upcomingSprintsRaw: SprintRow[];
  recentlyClosedRaw: SprintRow[];
  activeSprint: SprintSummary | null;
  upcomingSprints: SprintSummary[];
  recentlyClosed: SprintSummary[];
}

/** Fetch and shape all sprint data needed for the copilot context */
export async function fetchSprintContext(today: Date): Promise<SprintContext> {
  const [activeSprintRaw, upcomingSprintsRaw, recentlyClosedRaw] = await Promise.all([
    db.sprint.findFirst({
      where: { isActive: true },
      include: SPRINT_INCLUDE,
    }),
    db.sprint.findMany({
      where: { isActive: false, endDate: { gte: today } },
      orderBy: { startDate: "asc" },
      take: 3,
      include: SPRINT_INCLUDE,
    }),
    db.sprint.findMany({
      where: { endDate: { lt: today } },
      orderBy: { endDate: "desc" },
      take: 2,
      include: SPRINT_INCLUDE,
    }),
  ]);

  return {
    activeSprintRaw: activeSprintRaw ?? null,
    upcomingSprintsRaw,
    recentlyClosedRaw,
    activeSprint: activeSprintRaw ? buildSprintSummary(activeSprintRaw) : null,
    upcomingSprints: upcomingSprintsRaw.map(buildSprintSummary),
    recentlyClosed: recentlyClosedRaw.map(buildSprintSummary),
  };
}
