// SPEC: tickets.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  keywords: z.array(z.string()).optional(),
  team: z.nativeEnum(Team).optional(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

function adminOnly(role: string) {
  return role !== UserRole.ADMIN
    ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
    : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(session.user.role);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { keywords, ...rest } = parsed.data;
  const rule = await db.routingRule.update({
    where: { id },
    data: {
      ...rest,
      ...(keywords ? { keywords: JSON.stringify(keywords) } : {}),
    },
  });

  return NextResponse.json(rule);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(session.user.role);
  if (denied) return denied;

  const { id } = await params;
  await db.routingRule.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
