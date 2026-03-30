// SPEC: portfolio-view.md, brief-to-epic-workflow.md
// PATCH /api/epics/[id] — ADMIN or TEAM_LEAD only
// Updates epic fields. Includes status for manual ON_HOLD / CANCELLED overrides.
// After update, syncs the linked RoadmapItem when name or endDate changes.
// DELETE /api/epics/[id] — ADMIN or TEAM_LEAD only. Blocked if non-cancelled tickets reference the epic.
// Response: { data: Epic } | 204 | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { Team, EpicStatus, UserRole, TicketStatus } from "@prisma/client";
import { syncRoadmapItem } from "@/lib/sync-roadmap-item";

const updateEpicSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  team: z.nativeEnum(Team).nullable().optional(),
  color: z.string().min(1).max(32).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  // Only ON_HOLD and CANCELLED are meaningful manual overrides;
  // other values are also accepted so ADMIN can clear an override.
  status: z.nativeEnum(EpicStatus).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    session.user.role !== UserRole.ADMIN &&
    session.user.role !== UserRole.TEAM_LEAD
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateEpicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.epic.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { startDate, endDate, ...rest } = parsed.data;

  const resolvedEndDate =
    endDate !== undefined
      ? endDate === null
        ? null
        : new Date(endDate)
      : undefined;

  let epic;
  try {
    epic = await db.$transaction(async (tx) => {
      const updated = await tx.epic.update({
        where: { id },
        data: {
          ...rest,
          ...(startDate !== undefined
            ? { startDate: startDate === null ? null : new Date(startDate) }
            : {}),
          ...(resolvedEndDate !== undefined
            ? { endDate: resolvedEndDate }
            : {}),
        },
      });

      // Phase 5: keep the linked RoadmapItem in sync whenever name or endDate changes
      const nameChanged = parsed.data.name !== undefined;
      const endDateChanged = endDate !== undefined;
      if (nameChanged || endDateChanged) {
        await syncRoadmapItem(tx, updated.id, updated.name, updated.endDate);
      }

      return updated;
    });
  } catch {
    return NextResponse.json({ error: "Failed to update epic" }, { status: 500 });
  }

  return NextResponse.json({ data: epic });
}

// DELETE /api/epics/[id] — ADMIN or TEAM_LEAD only.
// Blocked if any non-cancelled tickets reference the epic.
// Response: 204 | { error: string }
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    session.user.role !== UserRole.ADMIN &&
    session.user.role !== UserRole.TEAM_LEAD
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await db.epic.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Block deletion if any non-terminal tickets are still linked to this epic
  const blockedCount = await db.ticket.count({
    where: {
      epicId: id,
      status: { not: TicketStatus.DONE },
    },
  });
  if (blockedCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete epic with ${blockedCount} active ticket(s). Cancel or remove them first.` },
      { status: 409 }
    );
  }

  try {
    await db.epic.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Failed to delete epic" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
