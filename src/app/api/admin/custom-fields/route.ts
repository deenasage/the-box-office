// SPEC: custom-fields.md
// GET  /api/admin/custom-fields — ADMIN only. Returns all custom fields ordered by `order`, with values count.
// POST /api/admin/custom-fields — ADMIN only. Creates a custom field; auto-sets `order` to max+1.
// Response: { data: CustomField[] } | { data: CustomField } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { CustomFieldType, Team, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const CreateCustomFieldSchema = z.object({
  name: z.string().min(1).max(255),
  fieldType: z.nativeEnum(CustomFieldType),
  teamScope: z.nativeEnum(Team).optional().nullable(),
  required: z.boolean().optional(),
  options: z
    .array(z.string().min(1))
    .optional()
    .nullable()
    .refine(
      (v) => v === undefined || v === null || v.length > 0,
      { message: "options must be a non-empty array when provided" }
    ),
});

// GET /api/admin/custom-fields — ADMIN only
export async function GET(_req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const fields = await db.customField.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { values: true } },
    },
  });

  return NextResponse.json({ data: fields });
}

// POST /api/admin/custom-fields — ADMIN only
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateCustomFieldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Validate that SELECT fields must have options
  if (parsed.data.fieldType === CustomFieldType.SELECT) {
    if (!parsed.data.options || parsed.data.options.length === 0) {
      return NextResponse.json(
        { error: "SELECT fields require at least one option" },
        { status: 400 }
      );
    }
  }

  try {
    // Determine next order value: max existing order + 1
    const maxOrderResult = await db.customField.aggregate({
      _max: { order: true },
    });
    const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

    const field = await db.customField.create({
      data: {
        name: parsed.data.name,
        fieldType: parsed.data.fieldType,
        teamScope: parsed.data.teamScope ?? null,
        required: parsed.data.required ?? false,
        order: nextOrder,
        options: parsed.data.options ? JSON.stringify(parsed.data.options) : null,
      },
      include: {
        _count: { select: { values: true } },
      },
    });

    return NextResponse.json({ data: field }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/custom-fields] error:", e);
    return NextResponse.json({ error: "Failed to create custom field" }, { status: 500 });
  }
}
