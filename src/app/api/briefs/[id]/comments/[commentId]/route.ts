// SPEC: brief-to-epic-workflow.md
// Phase 1 — Mark a brief comment resolved/unresolved (auth required)
// PATCH /api/briefs/[id]/comments/[commentId]

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  resolved: z.boolean(),
});

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

function canResolveComments(
  session: { user: { id: string; role: UserRole } },
  creatorId: string
): boolean {
  return (
    session.user.id === creatorId ||
    session.user.role === UserRole.ADMIN ||
    isTeamLead(session.user.role as UserRole)
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, commentId } = await params;

  const brief = await db.brief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  if (!canResolveComments(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comment = await db.briefComment.findFirst({
    where: { id: commentId, briefId: id },
  });
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.briefComment.update({
    where: { id: commentId },
    data: {
      resolved: parsed.data.resolved,
      resolvedAt: parsed.data.resolved ? new Date() : null,
      resolvedById: parsed.data.resolved ? session.user.id : null,
    },
    include: {
      shareToken: { select: { id: true, label: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
