// SPEC: skillsets.md
// GET /api/capacity/skillsets
//   Query params: sprintId (optional), team (optional, defaults to all teams)
//   Auth: requireAuth — any authenticated user
//   Response shape (direct object, not wrapped in { data }):
//     { sprintId, sprintName, skillsets: SkillsetRow[], membersWithNoSkillset: { userId, name }[] }
//   SkillsetRow: { skillsetId, skillsetName, color, members, totalCapacityPoints,
//                  totalCommittedPoints, loadPct, ticketCount }
//   Member: { userId, name, capacityPoints, committedPoints, utilizationPct }
//   Capacity defaults to 40 points when no TeamCapacity record exists for the user+sprint.
//   A member with multiple skillsets appears in each relevant skillset row (by design).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team } from "@prisma/client";
import { SIZE_HOURS } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DEFAULT_CAPACITY = 40;

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const sprintId = req.nextUrl.searchParams.get("sprintId");
  const teamParam = req.nextUrl.searchParams.get("team");

  // Validate optional team param against the enum values.
  let teamFilter: Team | undefined;
  if (teamParam) {
    if (!Object.values(Team).includes(teamParam as Team)) {
      return NextResponse.json({ error: `Invalid team value: ${teamParam}` }, { status: 400 });
    }
    teamFilter = teamParam as Team;
  }

  // Resolve sprint: explicit id or fall back to the active sprint.
  const sprint = sprintId
    ? await db.sprint.findUnique({ where: { id: sprintId } })
    : await db.sprint.findFirst({ where: { isActive: true } });

  if (!sprint) {
    return NextResponse.json({
      sprintId: null,
      sprintName: null,
      skillsets: [],
      membersWithNoSkillset: [],
    });
  }

  // Fetch all skillsets scoped to the requested team (or all if no team filter).
  // We only include non-null-team skillsets when a team filter is given,
  // keeping global skillsets out of the per-team breakdown.
  const skillsets = await db.skillset.findMany({
    where: teamFilter ? { team: teamFilter } : undefined,
    orderBy: { name: "asc" },
  });

  // Fetch all users on the filtered team (or all team-affiliated users if no filter).
  const users = await db.user.findMany({
    where: teamFilter ? { team: teamFilter } : { team: { not: null } },
    select: {
      id: true,
      name: true,
      team: true,
      skillsets: {
        select: { skillsetId: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Fetch capacity records for all users in this sprint in a single query.
  const capacityRecords = await db.teamCapacity.findMany({
    where: { sprintId: sprint.id },
    select: { userId: true, points: true },
  });
  const capacityByUser = new Map(capacityRecords.map((c) => [c.userId, c.points]));

  // Fetch all sprint tickets that have an assignee and a requiredSkillsetId.
  // We need both fields to attribute committed hours to a skillset+user pair.
  const sprintTickets = await db.ticket.findMany({
    where: {
      sprintId: sprint.id,
      assigneeId: { not: null },
      requiredSkillsetId: { not: null },
    },
    select: {
      assigneeId: true,
      requiredSkillsetId: true,
      size: true,
    },
  });

  // Build a committed-hours lookup: map[skillsetId][userId] = total hours
  const committedMap = new Map<string, Map<string, number>>();
  for (const ticket of sprintTickets) {
    // Both fields are non-null due to the where clause above, but TypeScript
    // doesn't narrow them through the Prisma query — assert non-null here.
    const skillId = ticket.requiredSkillsetId!;
    const userId = ticket.assigneeId!;
    const hours = ticket.size ? SIZE_HOURS[ticket.size] : 0;

    if (!committedMap.has(skillId)) committedMap.set(skillId, new Map());
    const inner = committedMap.get(skillId)!;
    inner.set(userId, (inner.get(userId) ?? 0) + hours);
  }

  // Count tickets per skillset (regardless of assignee) for the ticketCount display.
  const ticketCountBySkillset = new Map<string, number>();
  for (const ticket of sprintTickets) {
    const skillId = ticket.requiredSkillsetId!;
    ticketCountBySkillset.set(skillId, (ticketCountBySkillset.get(skillId) ?? 0) + 1);
  }

  // Build the per-skillset rows.
  const skillsetRows = skillsets.map((skillset) => {
    // Members who hold this skillset.
    const members = users.filter((u) =>
      u.skillsets.some((us) => us.skillsetId === skillset.id)
    );

    const userCommitted = committedMap.get(skillset.id) ?? new Map<string, number>();

    const memberRows = members.map((user) => {
      const capacityPoints = capacityByUser.get(user.id) ?? DEFAULT_CAPACITY;
      const committedPoints = userCommitted.get(user.id) ?? 0;
      const utilizationPct =
        capacityPoints > 0
          ? Math.round((committedPoints / capacityPoints) * 100)
          : null;
      return {
        userId: user.id,
        name: user.name,
        capacityPoints,
        committedPoints,
        utilizationPct,
      };
    });

    const totalCapacityPoints = memberRows.reduce(
      (sum, m) => sum + (m.capacityPoints ?? 0),
      0
    );
    const totalCommittedPoints = memberRows.reduce(
      (sum, m) => sum + m.committedPoints,
      0
    );
    const loadPct =
      totalCapacityPoints > 0
        ? Math.round((totalCommittedPoints / totalCapacityPoints) * 100)
        : null;

    const ticketCount = ticketCountBySkillset.get(skillset.id) ?? 0;

    return {
      skillsetId: skillset.id,
      skillsetName: skillset.name,
      color: skillset.color,
      members: memberRows,
      totalCapacityPoints,
      totalCommittedPoints,
      loadPct,
      ticketCount,
    };
  });

  // Members who have NO skillsets at all (for the warning banner).
  // Only meaningful when a team filter is active.
  const membersWithNoSkillset = users
    .filter((u) => u.skillsets.length === 0)
    .map((u) => ({ userId: u.id, name: u.name }));

  // Return the object directly (not wrapped in { data }) — this is what
  // SkillsetCapacityPanel expects: res is typed as SkillsetCapacityData directly.
  return NextResponse.json({
    sprintId: sprint.id,
    sprintName: sprint.name,
    skillsets: skillsetRows,
    membersWithNoSkillset,
  });
}
