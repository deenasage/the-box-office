// SPEC: ai-brief.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { BriefStatus, UserRole } from "@prisma/client";
import type { ClarificationItem } from "@/lib/ai/brief-generator";
import { syncEpicStatus } from "@/lib/epic-status";
import { createNotification } from "@/lib/notify-users";

function canMutate(
  session: { user: { id: string; role: UserRole } },
  creatorId: string
) {
  return (
    session.user.id === creatorId ||
    session.user.role === UserRole.ADMIN ||
    isTeamLead(session.user.role as UserRole)
  );
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const brief = await db.brief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canMutate(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (brief.status !== BriefStatus.REVIEW) {
    return NextResponse.json({ error: "Brief must be in REVIEW state to finalize." }, { status: 400 });
  }

  const clarifications: ClarificationItem[] = brief.clarifications
    ? JSON.parse(brief.clarifications)
    : [];

  const unanswered = clarifications.filter((c) => !c.answered && !c.answer);
  if (unanswered.length > 0) {
    return NextResponse.json(
      { error: "All clarifications must be answered before finalizing." },
      { status: 400 }
    );
  }

  const updated = await db.brief.update({
    where: { id },
    data: { status: BriefStatus.FINALIZED },
  });

  // Sync epic status now that a brief has been finalized
  if (brief.epicId) await syncEpicStatus(brief.epicId);

  // Notify the brief creator (unless they finalized it themselves)
  if (brief.creatorId !== session.user.id) {
    void createNotification(
      brief.creatorId,
      `Your brief '${brief.title}' has been finalized and is ready for ticket generation`,
      `/briefs/${brief.id}`
    );
  }

  return NextResponse.json(updated);
}
