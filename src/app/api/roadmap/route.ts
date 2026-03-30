// SPEC: roadmap.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team } from "@prisma/client";
import { z } from "zod";
import type { RoadmapPayload } from "@/types";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  let team: Team | undefined;
  const teamParam = req.nextUrl.searchParams.get("team");
  if (teamParam !== null) {
    const parsed = z.nativeEnum(Team).safeParse(teamParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid team" }, { status: 400 });
    }
    team = parsed.data;
  }

  const [epics, sprints] = await Promise.all([
    db.epic.findMany({
      where: team !== undefined ? { OR: [{ team }, { team: null }] } : undefined,
      include: {
        tickets: {
          select: { id: true, title: true, status: true, team: true },
        },
      },
      orderBy: { startDate: "asc" },
    }),
    db.sprint.findMany({
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const payload: RoadmapPayload = { epics, sprints };
  return NextResponse.json(payload);
}
