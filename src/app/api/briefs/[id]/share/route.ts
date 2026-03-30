// SPEC: brief-to-epic-workflow.md
// Phase 1 — Share token management (auth-gated)
// POST  /api/briefs/[id]/share  — create a BriefShareToken
// GET   /api/briefs/[id]/share  — list all tokens for a brief

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { z } from "zod";

const PostSchema = z.object({
  label: z.string().max(200).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

function canManageTokens(
  session: { user: { id: string; role: UserRole } },
  creatorId: string
): boolean {
  return (
    session.user.id === creatorId ||
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.TEAM_LEAD
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
  if (!canManageTokens(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tokens = await db.briefShareToken.findMany({
    where: { briefId: id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { comments: true } },
    },
  });

  const result = tokens.map((t) => ({
    id: t.id,
    label: t.label,
    revoked: t.revoked,
    createdAt: t.createdAt,
    commentCount: t._count.comments,
  }));

  return NextResponse.json({ data: result });
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const brief = await db.brief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTokens(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // 256-bit hex token — do not use cuid() or Math.random()
  const token = randomBytes(32).toString("hex");

  const shareToken = await db.briefShareToken.create({
    data: {
      briefId: id,
      token,
      label: parsed.data.label ?? null,
    },
  });

  return NextResponse.json({ data: shareToken }, { status: 201 });
}
