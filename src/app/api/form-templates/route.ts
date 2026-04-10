// SPEC: form-builder.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const templates = await db.formTemplate.findMany({
      include: { _count: { select: { fields: true, tickets: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const template = await db.formTemplate.create({ data: parsed.data });
    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
