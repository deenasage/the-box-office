// SPEC: sprints.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (
    !isPrivileged(session.user.role as UserRole)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const source = await db.sprint.findUnique({
    where: { id },
    include: {
      capacities: {
        select: { userId: true, points: true, hours: true },
      },
    },
  });

  if (!source) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

  // Offset dates: new start = source end + 1 day, new end = new start + original duration
  const sourceDurationMs = source.endDate.getTime() - source.startDate.getTime();
  const newStartDate = new Date(source.endDate.getTime() + 24 * 60 * 60 * 1000);
  const newEndDate = new Date(newStartDate.getTime() + sourceDurationMs);

  try {
    const newSprint = await db.sprint.create({
      data: {
        name: `${source.name} (Copy)`,
        notes: source.notes,
        startDate: newStartDate,
        endDate: newEndDate,
        isActive: false,
        capacities: {
          create: source.capacities.map((c) => ({
            userId: c.userId,
            points: c.points,
            hours: c.hours,
          })),
        },
      },
    });
    return NextResponse.json({ data: newSprint }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
