// SPEC: brief-to-epic-workflow.md
// Phase 4 — Update / delete a single GanttItem
// PATCH  /api/epics/[id]/gantt/[ganttId] — partial update; ADMIN or TEAM_LEAD only
// DELETE /api/epics/[id]/gantt/[ganttId] — remove item; ADMIN or TEAM_LEAD only
// Response: { data: GanttItem } | 204 | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { Team, UserRole } from "@prisma/client";

// ── Zod schema ────────────────────────────────────────────────────────────────

const UpdateGanttItemSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    team: z.nativeEnum(Team).nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{3,8}$/, "color must be a hex string")
      .nullable()
      .optional(),
    startDate: z
      .string()
      .datetime({ message: "startDate must be an ISO datetime string" })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: "endDate must be an ISO datetime string" })
      .optional(),
    order: z.number().int().optional(),
  })
  .strict();

// ── Shared auth + ownership guard ─────────────────────────────────────────────

async function guardAdminOrLead(epicId: string, ganttId: string) {
  const { session, error } = await requireAuth();
  if (error) return { session: null, ganttItem: null, authError: error };

  if (
    session.user.role !== UserRole.ADMIN &&
    session.user.role !== UserRole.TEAM_LEAD
  ) {
    return {
      session: null,
      ganttItem: null,
      authError: NextResponse.json(
        { error: "Forbidden — admin or team lead required" },
        { status: 403 }
      ),
    };
  }

  const ganttItem = await db.ganttItem.findUnique({ where: { id: ganttId } });

  if (!ganttItem || ganttItem.epicId !== epicId) {
    return {
      session: null,
      ganttItem: null,
      authError: NextResponse.json({ error: "Gantt item not found" }, { status: 404 }),
    };
  }

  return { session, ganttItem, authError: null };
}

// ── PATCH /api/epics/[id]/gantt/[ganttId] ─────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ganttId: string }> }
) {
  const { id, ganttId } = await params;
  const { ganttItem, authError } = await guardAdminOrLead(id, ganttId);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateGanttItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { startDate, endDate, team, color, ...rest } = parsed.data;

  // Resolve final start/end — fall back to existing values for cross-field validation
  const resolvedStart = startDate ? new Date(startDate) : ganttItem!.startDate;
  const resolvedEnd = endDate ? new Date(endDate) : ganttItem!.endDate;

  if (resolvedStart >= resolvedEnd) {
    return NextResponse.json(
      { error: "startDate must be before endDate" },
      { status: 400 }
    );
  }

  let updated;
  try {
    updated = await db.ganttItem.update({
      where: { id: ganttId },
      data: {
        ...rest,
        ...(team !== undefined ? { team } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(startDate !== undefined ? { startDate: resolvedStart } : {}),
        ...(endDate !== undefined ? { endDate: resolvedEnd } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update Gantt item" }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}

// ── DELETE /api/epics/[id]/gantt/[ganttId] ────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; ganttId: string }> }
) {
  const { id, ganttId } = await params;
  const { authError } = await guardAdminOrLead(id, ganttId);
  if (authError) return authError;

  try {
    await db.ganttItem.delete({ where: { id: ganttId } });
  } catch {
    return NextResponse.json({ error: "Failed to delete Gantt item" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
