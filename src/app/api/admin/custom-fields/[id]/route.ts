// SPEC: custom-fields.md
// PATCH  /api/admin/custom-fields/[id] — ADMIN only. Updates name, required, options, order, teamScope.
// DELETE /api/admin/custom-fields/[id] — ADMIN only. Deletes field (cascades to values).
// Response: { data: CustomField } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { CustomFieldType, Team, Prisma } from "@prisma/client";

const PatchCustomFieldSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  required: z.boolean().optional(),
  options: z
    .array(z.string().min(1))
    .nullable()
    .optional(),
  order: z.number().int().min(0).optional(),
  teamScope: z.nativeEnum(Team).nullable().optional(),
});

// PATCH /api/admin/custom-fields/[id] — ADMIN only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchCustomFieldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify field exists and check SELECT constraint if options are being cleared
  const existing = await db.customField.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
  }

  // If this is a SELECT field and options are being explicitly set to null/empty, reject
  if (
    existing.fieldType === CustomFieldType.SELECT &&
    parsed.data.options !== undefined &&
    (parsed.data.options === null || parsed.data.options.length === 0)
  ) {
    return NextResponse.json(
      { error: "SELECT fields require at least one option" },
      { status: 400 }
    );
  }

  try {
    const updateData: Prisma.CustomFieldUpdateInput = {};

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.required !== undefined) updateData.required = parsed.data.required;
    if (parsed.data.order !== undefined) updateData.order = parsed.data.order;
    if (parsed.data.teamScope !== undefined) updateData.teamScope = parsed.data.teamScope;
    if (parsed.data.options !== undefined) {
      updateData.options =
        parsed.data.options !== null ? JSON.stringify(parsed.data.options) : null;
    }

    const field = await db.customField.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { values: true } },
      },
    });

    return NextResponse.json({ data: field });
  } catch (e) {
    console.error("[PATCH /api/admin/custom-fields/:id] error:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 });
  }
}

// DELETE /api/admin/custom-fields/[id] — ADMIN only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    await db.customField.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }
    console.error("[DELETE /api/admin/custom-fields/:id] error:", e);
    return NextResponse.json({ error: "Failed to delete custom field" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
