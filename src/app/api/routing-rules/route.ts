// SPEC: tickets.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  keywords: z.array(z.string()).min(1),
  team: z.nativeEnum(Team),
  priority: z.number().int().min(0).optional(),
});

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const rules = await db.routingRule.findMany({ orderBy: { priority: "desc" } });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rule = await db.routingRule.create({
    data: {
      name: parsed.data.name,
      keywords: JSON.stringify(parsed.data.keywords),
      team: parsed.data.team,
      priority: parsed.data.priority ?? 0,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
