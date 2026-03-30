// SPEC: brief-to-epic-workflow.md
// Phase 1 — Per-token management (auth-gated)
// PATCH  /api/briefs/[id]/share/[tokenId]  — update label or revoke
// DELETE /api/briefs/[id]/share/[tokenId]  — delete token entirely

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const PatchSchema = z.object({
  label: z.string().max(200).nullable().optional(),
  revoked: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string; tokenId: string }> };

async function resolveAndAuthorise(
  session: { user: { id: string; role: UserRole } },
  briefId: string,
  tokenId: string
) {
  const brief = await db.brief.findUnique({ where: { id: briefId } });
  if (!brief) return { ok: false as const, response: NextResponse.json({ error: "Brief not found" }, { status: 404 }) };

  const canManage =
    session.user.id === brief.creatorId ||
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.TEAM_LEAD;

  if (!canManage) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const token = await db.briefShareToken.findFirst({
    where: { id: tokenId, briefId },
  });
  if (!token) return { ok: false as const, response: NextResponse.json({ error: "Token not found" }, { status: 404 }) };

  return { ok: true as const, token };
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, tokenId } = await params;
  const resolved = await resolveAndAuthorise(session, id, tokenId);
  if (!resolved.ok) return resolved.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.briefShareToken.update({
    where: { id: tokenId },
    data: {
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
      ...(parsed.data.revoked !== undefined ? { revoked: parsed.data.revoked } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, tokenId } = await params;
  const resolved = await resolveAndAuthorise(session, id, tokenId);
  if (!resolved.ok) return resolved.response;

  await db.briefShareToken.delete({ where: { id: tokenId } });
  return new NextResponse(null, { status: 204 });
}
