// SPEC: brief-to-epic-workflow.md
// Phase 1 — Approve a brief (any authenticated user — stakeholders use share tokens,
//            but logged-in users can also approve directly)
// POST /api/briefs/[id]/approve — transitions REVIEW → APPROVED
// Returns { data: updatedBrief }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { BriefStatus } from "@prisma/client";
import { createNotification } from "@/lib/notify-users";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const brief = await db.brief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (brief.status !== BriefStatus.REVIEW) {
    return NextResponse.json(
      { error: "Brief must be in REVIEW status to approve." },
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
