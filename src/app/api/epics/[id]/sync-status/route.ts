// SPEC: portfolio-view.md
// POST /api/epics/[id]/sync-status — ADMIN or TEAM_LEAD only
// Force-recomputes and persists epic.status.
// Response: { data: { status: EpicStatus } }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";
import { syncEpicStatus } from "@/lib/epic-status";
import { db } from "@/lib/db";

export async function POST(
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

  // Verify epic exists before attempting sync
  const exists = await db.epic.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = await syncEpicStatus(id);
  return NextResponse.json({ data: { status } });
}
