// SPEC: capacity-planning.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { SIZE_HOURS } from "@/lib/utils";
import { Team, TicketSize } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/capacity/heatmap
// Auth: any authenticated user
// Returns a grid of utilization percentages for every team member across
// the last N completed (non-active) sprints, ordered oldest → newest.
// Response shape:
//   { sprints: { id, name }[]; rows: { userId, name, team, cells: { sprintId, utilPct }[] }[] }

interface HeatmapCell {
  sprintId: string;
  utilPct: number | null;
}

interface HeatmapRow {
  userId: string;
  name: string;
  team: Team;
  cells: HeatmapCell[];
}

interface HeatmapResponse {
  sprints: { id: string; name: string }[];
  rows: HeatmapRow[];
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  // Allow caller to override the default window of 6 sprints.
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(24, parseInt(limitParam, 10))) : 6;

  // Step 1 — Fetch last N completed sprints, then reverse to oldest→newest.
  const recentDesc = await db.sprint.findMany({
    where: { isActive: false },
    orderBy: { startDate: "desc" },
    take: limit,
    select: { id: true, name: true, startDate: true },
  });

  // Reverse so the grid columns read left=oldest, right=newest.
  const sprints = recentDesc.reverse();

  if (sprints.length === 0) {
    return NextResponse.json<HeatmapResponse>({ sprints: [], rows: [] });
  }

  const sprintIds = sprints.map((s) => s.id);

  // Step 2 — Fetch all users who have at least one team assignment.
  // A single query covers all teams — no N+1.
  const users = await db.user.findMany({
    where: { team: { not: null } },
    select: { id: true, name: true, team: true },
    orderBy: { name: "asc" },
  });

  if (users.length === 0) {
    return NextResponse.json<HeatmapResponse>({ sprints, rows: [] });
  }

  const userIds = users.map((u) => u.id);

  // Step 3 — Fetch all TeamCapacity records for these sprints in one query.
  const capacities = await db.teamCapacity.findMany({
    where: { sprintId: { in: sprintIds }, userId: { in: userIds } },
    select: { sprintId: true, userId: true, points: true },
  });

  // Step 4 — Fetch all sprint tickets assigned to these users in one query.
  // We only need sprintId, assigneeId, and size to compute committed hours.
  const tickets = await db.ticket.findMany({
    where: {
      sprintId: { in: sprintIds },
      assigneeId: { in: userIds },
      size: { not: null },
    },
    select: { sprintId: true, assigneeId: true, size: true },
  });

  // Build lookup maps for O(1) access during grid construction.
  // capacityMap: `${sprintId}:${userId}` → points
  const capacityMap = new Map<string, number>();
  for (const c of capacities) {
    capacityMap.set(`${c.sprintId}:${c.userId}`, c.points);
  }

  // committedMap: `${sprintId}:${userId}` → total committed hours
  const committedMap = new Map<string, number>();
  for (const t of tickets) {
    if (!t.sprintId || !t.assigneeId || !t.size) continue;
    const key = `${t.sprintId}:${t.assigneeId}`;
    const hours = SIZE_HOURS[t.size as TicketSize] ?? 0;
    committedMap.set(key, (committedMap.get(key) ?? 0) + hours);
  }

  // Step 5 — Build the response grid.
  const rows: HeatmapRow[] = users.map((user) => {
    const cells: HeatmapCell[] = sprints.map((sprint) => {
      const key = `${sprint.id}:${user.id}`;
      const capacity = capacityMap.get(key);
      const committed = committedMap.get(key) ?? 0;

      // null when there is no capacity record or capacity is zero — we cannot
      // compute a meaningful percentage without a denominator.
      const utilPct =
        capacity !== undefined && capacity > 0
          ? Math.round((committed / capacity) * 100)
          : null;

      return { sprintId: sprint.id, utilPct };
    });

    return {
      userId: user.id,
      name: user.name,
      team: user.team as Team, // narrowed: we filtered team != null above
      cells,
    };
  });

  return NextResponse.json<HeatmapResponse>({ sprints, rows });
}
