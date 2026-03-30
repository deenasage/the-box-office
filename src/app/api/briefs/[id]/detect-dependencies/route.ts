// SPEC: dependencies.md
// POST /api/briefs/[id]/detect-dependencies — Owner, ADMIN, or TEAM_LEAD — trigger Claude dependency detection
// Returns AIDetectedDependency[] (not saved — user confirms in a subsequent step)
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { detectDependencies } from "@/lib/ai/dependency-detector";
import { UserRole } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const brief = await db.brief.findUnique({
    where: { id },
    select: {
      id: true,
      creatorId: true,
      tickets: {
        select: {
          id: true,
          title: true,
          team: true,
          description: true,
        },
      },
    },
  });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ownership check: only the creator, ADMIN, or TEAM_LEAD may trigger detection
  const { role, id: userId } = session.user;
  if (
    brief.creatorId !== userId &&
    role !== UserRole.ADMIN &&
    role !== UserRole.TEAM_LEAD
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (brief.tickets.length === 0) {
    return NextResponse.json(
      { error: "No tickets linked to this brief — generate tickets first." },
      { status: 400 }
    );
  }

  try {
    const suggestions = await detectDependencies(
      brief.tickets.map((t) => ({
        id: t.id,
        title: t.title,
        team: t.team,
        description: t.description,
      }))
    );
    return NextResponse.json({ data: suggestions });
  } catch (err) {
    console.error("Dependency detection failed:", err);
    return NextResponse.json(
      { error: "Dependency detection failed. Please try again." },
      { status: 500 }
    );
  }
}
