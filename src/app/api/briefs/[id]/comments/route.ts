// SPEC: brief-to-epic-workflow.md
// Phase 1 — PM comment review (auth required)
// GET /api/briefs/[id]/comments  — list all comments for a brief

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

function canViewComments(
  session: { user: { id: string; role: UserRole } },
  creatorId: string
): boolean {
  return (
    session.user.id === creatorId ||
    session.user.role === UserRole.ADMIN ||
    isTeamLead(session.user.role as UserRole)
  );
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const brief = await db.brief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewComments(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comments = await db.briefComment.findMany({
    where: { briefId: id },
    orderBy: { createdAt: "asc" },
    include: {
      shareToken: { select: { id: true, label: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: comments });
}
