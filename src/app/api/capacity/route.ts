// SPEC: capacity-planning.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team, TicketStatus } from "@prisma/client";
import { SIZE_HOURS } from "@/lib/utils";

// GET /api/capacity — authenticated, returns team capacity vs committed points for a sprint
// Response: { sprintId, sprintName, teams } | { error: string }
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const sprintId = req.nextUrl.searchParams.get("sprintId");

  try {
    // Resolve sprint
    const sprint = sprintId
      ? await db.sprint.findUnique({ where: { id: sprintId } })
      : await db.sprint.findFirst({ where: { isActive: true } });

    if (!sprint) return NextResponse.json({ teams: [] });

    // Last 3 completed sprints for velocity
    const pastSprints = await db.sprint.findMany({
      where: { isActive: false, id: { not: sprint.id } },
      orderBy: { endDate: "desc" },
      take: 3,
      include: {
        tickets: {
          where: { status: TicketStatus.DONE },
          select: { team: true, size: true },
        },
      },
    });

    // All users with their capacity for this sprint
    const [users, capacities, sprintTickets] = await Promise.all([
      db.user.findMany({
        where: { team: { not: null } },
        select: { id: true, name: true, team: true },
        orderBy: { name: "asc" },
      }),
      db.teamCapacity.findMany({
        where: { sprintId: sprint.id },
        select: { userId: true, points: true },
      }),
      db.ticket.findMany({
        where: { sprintId: sprint.id, assigneeId: { not: null } },
        select: { team: true, size: true, assigneeId: true },
      }),
    ]);

    const teams = Object.values(Team);

    const result = teams.map((team) => {
      const members = users.filter((u) => u.team === team);

      const memberRows = members.map((user) => {
        const cap = capacities.find((c) => c.userId === user.id);
        const committed = sprintTickets
          .filter((t) => t.assigneeId === user.id)
          .reduce((s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0), 0);
        const capacityPoints = cap?.points ?? null;
        const utilizationPct =
          capacityPoints != null && capacityPoints > 0
            ? Math.round((committed / capacityPoints) * 100)
            : null;
        return { userId: user.id, name: user.name, capacityPoints, committedPoints: committed, utilizationPct };
      });

      const totalCapacity = memberRows.reduce((s, m) => s + (m.capacityPoints ?? 0), 0);
      const totalCommitted = memberRows.reduce((s, m) => s + m.committedPoints, 0);

      // Avg velocity from past sprints
      const pastPoints = pastSprints.map((ps) =>
        ps.tickets
          .filter((t) => t.team === team)
          .reduce((s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0), 0)
      );
      const avgVelocity =
        pastPoints.length > 0
          ? Math.round(pastPoints.reduce((s, v) => s + v, 0) / pastPoints.length)
          : null;

      const utilizationPct =
        totalCapacity > 0 ? Math.round((totalCommitted / totalCapacity) * 100) : 0;

      return { team, members: memberRows, totalCapacity, totalCommitted, avgVelocity, utilizationPct };
    });

    return NextResponse.json({ sprintId: sprint.id, sprintName: sprint.name, teams: result });
  } catch (err) {
    console.error("[GET /api/capacity]", err);
    return NextResponse.json({ error: "Failed to fetch capacity data" }, { status: 500 });
  }
}
