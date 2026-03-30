// SPEC: reports.md
// GET /api/reports/time-accuracy
// Auth: any authenticated user
// Query params: ?team=<Team> ?sprintId=<string>
// Response: { data: { summary: TeamSummary[], tickets: TicketAccuracy[] } }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { SIZE_HOURS } from "@/lib/utils";
import { Team, TicketSize } from "@prisma/client";

const QuerySchema = z.object({
  team: z.nativeEnum(Team).optional(),
  sprintId: z.string().cuid().optional(),
});

interface TicketAccuracy {
  id: string;
  title: string;
  team: string;
  size: string;
  estimated: number;
  actual: number;
  variance: number;
  variancePct: number;
}

interface TeamSummary {
  team: string;
  totalEstimated: number;
  totalActual: number;
  avgVariancePct: number;
  ticketCount: number;
}

// GET /api/reports/time-accuracy
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const queryParsed = QuerySchema.safeParse({
    team: searchParams.get("team") ?? undefined,
    sprintId: searchParams.get("sprintId") ?? undefined,
  });

  if (!queryParsed.success) {
    return NextResponse.json(
      { error: queryParsed.error.flatten() },
      { status: 400 }
    );
  }

  const { team, sprintId } = queryParsed.data;

  try {
    const tickets = await db.ticket.findMany({
      where: {
        // Must have a size set
        size: { not: null },
        // Must have at least one time log entry
        timeLogs: { some: {} },
        // Optional team filter
        ...(team ? { team } : {}),
        // Optional sprint filter
        ...(sprintId ? { sprintId } : {}),
      },
      select: {
        id: true,
        title: true,
        team: true,
        size: true,
        timeLogs: {
          select: { hours: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const ticketRows: TicketAccuracy[] = tickets.map((t) => {
      // size is guaranteed non-null by the query where clause
      const size = t.size as TicketSize;
      const estimated = SIZE_HOURS[size];
      const actual = t.timeLogs.reduce((sum, log) => sum + log.hours, 0);
      const variance = actual - estimated;
      const variancePct =
        estimated > 0
          ? Math.round((variance / estimated) * 100 * 100) / 100
          : 0;

      return {
        id: t.id,
        title: t.title,
        team: t.team,
        size,
        estimated,
        actual: Math.round(actual * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePct,
      };
    });

    // Group by team for summary
    const teamMap = new Map<
      string,
      { totalEstimated: number; totalActual: number; variancePcts: number[] }
    >();

    for (const row of ticketRows) {
      const existing = teamMap.get(row.team) ?? {
        totalEstimated: 0,
        totalActual: 0,
        variancePcts: [],
      };
      existing.totalEstimated += row.estimated;
      existing.totalActual += row.actual;
      existing.variancePcts.push(row.variancePct);
      teamMap.set(row.team, existing);
    }

    const summary: TeamSummary[] = [];
    for (const [teamName, agg] of teamMap.entries()) {
      const ticketCount = agg.variancePcts.length;
      const avgVariancePct =
        ticketCount > 0
          ? Math.round(
              (agg.variancePcts.reduce((s, v) => s + v, 0) / ticketCount) * 100
            ) / 100
          : 0;

      summary.push({
        team: teamName,
        totalEstimated: Math.round(agg.totalEstimated * 100) / 100,
        totalActual: Math.round(agg.totalActual * 100) / 100,
        avgVariancePct,
        ticketCount,
      });
    }

    // Sort summary by team name for stable ordering
    summary.sort((a, b) => a.team.localeCompare(b.team));

    return NextResponse.json({ data: { summary, tickets: ticketRows } });
  } catch (err) {
    console.error("[time-accuracy report]", err);
    return NextResponse.json(
      { error: "Failed to compute time accuracy report" },
      { status: 500 }
    );
  }
}
