// SPEC: skillsets.md
// GET  /api/skillsets        — list all skillsets; optional ?team=DESIGN filter. Any authenticated user.
// POST /api/skillsets        — create a skillset { name, team? }. ADMIN only.
// Response shape: { data: Skillset | Skillset[] } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team, UserRole, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSkillsetSchema = z.object({
  name: z.string().min(1).max(100),
  team: z.nativeEnum(Team).optional(),
});

// GET /api/skillsets — authenticated, any role
// Query params: ?team=DESIGN (optional, filters to team-scoped + global for that team)
// Returns: { data: Skillset[] }
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const teamParam = req.nextUrl.searchParams.get("team");
  let teamFilter: Team | undefined;
  if (teamParam !== null) {
    const parsed = z.nativeEnum(Team).safeParse(teamParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid team value" }, { status: 400 });
    }
    teamFilter = parsed.data;
  }

  const isActiveParam = req.nextUrl.searchParams.get("isActive");
  const isActiveFilter =
    isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

  const skillsets = await db.skillset.findMany({
    where: {
      ...(teamFilter !== undefined ? { team: teamFilter } : {}),
      ...(isActiveFilter !== undefined ? { isActive: isActiveFilter } : {}),
    },
    orderBy: [{ team: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ data: skillsets });
}

// POST /api/skillsets — ADMIN only
// Body: { name: string, team?: Team }
// Returns 201: { data: Skillset } | 409 if name+team already exists
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSkillsetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const skillset = await db.skillset.create({
      data: {
        name: parsed.data.name,
        team: parsed.data.team ?? null,
      },
    });
    return NextResponse.json({ data: skillset }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A skillset with this name already exists for the given team scope" },
        { status: 409 }
      );
    }
    console.error("[POST /api/skillsets]", e);
    return NextResponse.json({ error: "Failed to create skillset" }, { status: 500 });
  }
}
