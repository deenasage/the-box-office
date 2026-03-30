// SPEC: brief-to-epic-workflow.md
// Phase 1 — Approve a brief (ADMIN / TEAM_LEAD only)
// POST /api/briefs/[id]/approve — transitions status to APPROVED

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { BriefStatus, UserRole } from "@prisma/client";
import { createNotification } from "@/lib/notify-users";

const APPROVABLE_STATUSES: BriefStatus[] = [BriefStatus.REVIEW, BriefStatus.FINALIZED];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const isAdminOrLead =
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.TEAM_LEAD;

  if (!isAdminOrLead) {
    return NextResponse.json({ error: "Forbidden — admin or team lead required" }, { status: 403 });
  }

  const { id } = await params;
  const brief = await db.brief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!APPROVABLE_STATUSES.includes(brief.status)) {
    return NextResponse.json(
      { error: "Brief must be in REVIEW or FINALIZED state to approve." },
      { status: 400 }
    );
  }

  let updated;
  try {
    updated = await db.brief.update({
      where: { id },
      data: { status: BriefStatus.APPROVED },
    });
  } catch {
    return NextResponse.json({ error: "Failed to approve brief" }, { status: 500 });
  }

  // Notify brief creator if approver is someone else
  if (brief.creatorId !== session.user.id) {
    void createNotification(
      brief.creatorId,
      `Your brief '${brief.title}' has been approved`,
      `/briefs/${brief.id}`
    );
  }

  return NextResponse.json({ data: updated });
}
