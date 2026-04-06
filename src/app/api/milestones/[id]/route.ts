// SPEC: roadmap.md
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

const UpdateMilestoneSchema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().optional(),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN && !isTeamLead(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body: unknown = await request.json();
  const parsed = UpdateMilestoneSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, date, description, color } = parsed.data;

  try {
    const existing = await db.milestone.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const milestone = await db.milestone.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(color !== undefined ? { color } : {}),
      },
    });

    return NextResponse.json({ data: milestone });
  } catch (err) {
    console.error("[PATCH /api/milestones/[id]]", err);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN && !isTeamLead(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await db.milestone.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.milestone.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/milestones/[id]]", err);
    return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 });
  }
}
