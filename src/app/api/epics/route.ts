// SPEC: portfolio-view.md
// GET /api/epics — Auth: any authenticated. Returns all epics with key fields.
// POST /api/epics — Auth: ADMIN or TEAM_LEAD. Creates a new epic.
// Response: { data: Epic[] } | { data: Epic } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { Team, EpicStatus, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const createEpicSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().min(1).max(32).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  team: z.nativeEnum(Team).optional(),
});

// GET /api/epics — returns all epics (id, name, color, status, startDate, endDate, team)
export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const epics = await db.epic.findMany({
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
      startDate: true,
      endDate: true,
      team: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: epics });
}

// POST /api/epics — ADMIN or TEAM_LEAD only. Creates an epic.
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    !isPrivileged(session.user.role as UserRole)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createEpicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, color, startDate, endDate, team } = parsed.data;

  const epic = await db.epic.create({
    data: {
      name,
      color: color ?? "#6366f1",
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      team: team ?? null,
      status: EpicStatus.INTAKE,
    },
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
      startDate: true,
      endDate: true,
      team: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: epic }, { status: 201 });
}
