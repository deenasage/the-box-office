// SPEC: sprints.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  userId: z.string(),
  points: z.number().int().min(0),
  hours: z.number().int().min(0).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const capacities = await db.teamCapacity.findMany({
    where: { sprintId: id },
    include: { user: { select: { id: true, name: true, team: true } } },
  });

  return NextResponse.json(capacities);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN && !isTeamLead(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: sprintId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const capacity = await db.teamCapacity.upsert({
      where: { sprintId_userId: { sprintId, userId: parsed.data.userId } },
      update: { points: parsed.data.points, hours: parsed.data.hours },
      create: { sprintId, ...parsed.data },
      include: { user: { select: { id: true, name: true, team: true } } },
    });
    return NextResponse.json(capacity);
  } catch (err) {
    console.error("[POST /api/sprints/:id/capacity]", err);
    return NextResponse.json({ error: "Failed to update capacity" }, { status: 500 });
  }
}
