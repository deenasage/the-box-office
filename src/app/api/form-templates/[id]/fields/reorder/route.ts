// SPEC: form-builder.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  fields: z.array(
    z.object({
      id: z.string(),
      order: z.number().int().min(0),
    })
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: templateId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify all fields belong to this template
  const fieldIds = parsed.data.fields.map((f) => f.id);
  const owned = await db.formField.count({
    where: { id: { in: fieldIds }, templateId },
  });
  if (owned !== fieldIds.length) {
    return NextResponse.json({ error: "One or more fields do not belong to this template" }, { status: 400 });
  }

  await db.$transaction(
    parsed.data.fields.map((f) =>
      db.formField.update({ where: { id: f.id }, data: { order: f.order } })
    )
  );

  return NextResponse.json({ ok: true });
}
