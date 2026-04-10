// SPEC: form-builder.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const original = await db.formTemplate.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await db.formTemplate.create({
    data: {
      name: `Copy of ${original.name}`,
      description: original.description,
      isActive: false,
      fields: {
        create: original.fields.map((f) => ({
          label: f.label,
          fieldKey: f.fieldKey,
          type: f.type,
          required: f.required,
          order: f.order,
          options: f.options,
          conditions: f.conditions,
        })),
      },
    },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(copy, { status: 201 });
}
