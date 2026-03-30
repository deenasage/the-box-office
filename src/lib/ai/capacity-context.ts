// SPEC: capacity-ai.md
// Assembles per-sprint capacity snapshots for Claude sprint planning.
import { db } from "@/lib/db";
import { Team, TicketSize } from "@prisma/client";
import { SIZE_HOURS } from "@/lib/utils";

export interface TeamScenarioBreakdown {
  team: Team;
  currentCapacityPoints: number;
  currentCommittedPoints: number;
  incomingPoints: number;
  projectedLoadPct: number;
  loadStatus: "FITS" | "TIGHT" | "OVERLOADED";
  suggestedAssignee: string | null;
  suggestedAssigneeName: string | null;
  availabilityPoints: number;
}

export interface SprintCapacityContext {
  sprintId: string;
  sprintName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  teams: TeamScenarioBreakdown[];
}

/** Points to use when a ticket has no size (conservative M=3). */
const UNSIZED_POINTS = SIZE_HOURS[TicketSize.M];

export async function buildCapacityContext(
  sprintIds: string[],
  incomingTickets: { team: Team; size: TicketSize | null }[]
): Promise<SprintCapacityContext[]> {
  const sprints = await db.sprint.findMany({
    where: { id: { in: sprintIds } },
    include: {
      tickets: { select: { team: true, size: true } },
      capacities: {
        include: { user: { select: { id: true, name: true, team: true } } },
      },
    },
  });

  return sprints.map((sprint) => {
    const teams: TeamScenarioBreakdown[] = Object.values(Team).map((team) => {
      // Total capacity for this team in this sprint (sum of all member points)
      const teamCapacities = sprint.capacities.filter(
        (c) => c.user.team === team
      );
      const currentCapacityPoints = teamCapacities.reduce(
        (sum, c) => sum + c.points,
        0
      );

      // Already committed points for this team in this sprint
      const currentCommittedPoints = sprint.tickets
        .filter((t) => t.team === team)
        .reduce(
          (sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : UNSIZED_POINTS),
          0
        );

      // Incoming points from the new tickets for this team
      const incomingPoints = incomingTickets
        .filter((t) => t.team === team)
        .reduce(
          (sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : UNSIZED_POINTS),
          0
        );

      const availabilityPoints = Math.max(
        0,
        currentCapacityPoints - currentCommittedPoints
      );

      const projectedLoad =
        currentCapacityPoints > 0
          ? ((currentCommittedPoints + incomingPoints) / currentCapacityPoints) * 100
          : incomingPoints > 0
          ? 200 // no capacity but has incoming — treat as overloaded
          : 0;

      const loadStatus: "FITS" | "TIGHT" | "OVERLOADED" =
        projectedLoad <= 90 ? "FITS" : projectedLoad <= 110 ? "TIGHT" : "OVERLOADED";

      // Suggest the team member with the most available points
      const suggestedMember = teamCapacities.length > 0
        ? teamCapacities
            .map((c) => {
              const memberCommitted = sprint.tickets
                .filter((t) => t.team === team) // approximate — can't tie to assignee here
                .reduce((s) => s, 0); // simplified: just pick highest capacity member
              return { user: c.user, points: c.points - memberCommitted };
            })
            .sort((a, b) => b.points - a.points)[0]
        : null;

      return {
        team,
        currentCapacityPoints,
        currentCommittedPoints,
        incomingPoints,
        projectedLoadPct: Math.round(projectedLoad),
        loadStatus,
        suggestedAssignee: suggestedMember?.user.id ?? null,
        suggestedAssigneeName: suggestedMember?.user.name ?? null,
        availabilityPoints,
      };
    });

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      startDate: sprint.startDate.toISOString(),
      endDate: sprint.endDate.toISOString(),
      isActive: sprint.isActive,
      teams,
    };
  });
}

/** Fetch the next N upcoming sprints (active + future). */
export async function getUpcomingSprints(limit = 3) {
  return db.sprint.findMany({
    where: { endDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    take: Math.min(limit, 6),
    select: { id: true },
  });
}
