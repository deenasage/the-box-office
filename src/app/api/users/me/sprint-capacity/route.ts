// SPEC: my-work.md
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PUT /api/users/me/sprint-capacity
// Body: { sprintId: string, daysOff: number }
// Upserts the TeamCapacity row for the current user + sprint with the given daysOff.
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { sprintId, daysOff } = body as Record<string, unknown>;

  if (typeof sprintId !== "string" || !sprintId) {
    return NextResponse.json({ error: "sprintId is required" }, { status: 400 });
  }
  if (typeof daysOff !== "number" || daysOff < 0 || !Number.isInteger(daysOff)) {
    return NextResponse.json({ error: "daysOff must be a non-negative integer" }, { status: 400 });
  }

  const sprint = await db.sprint.findUnique({ where: { id: sprintId }, select: { id: true, isActive: true } });
  if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

  const capacity = await db.teamCapacity.upsert({
    where: { sprintId_userId: { sprintId, userId: session.user.id } },
    create: { sprintId, userId: session.user.id, points: 0, daysOff },
    update: { daysOff },
  });

  return NextResponse.json({ daysOff: capacity.daysOff });
}
