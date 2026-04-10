// SPEC: form-builder.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole, FieldType } from "@prisma/client";
import type { ConditionalRule } from "@/types";

export const dynamic = "force-dynamic";

const ruleSchema = z.object({
  when: z.object({
    fieldKey: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
    value: z.string().optional(),
  }),
  action: z.enum(["show", "hide", "require"]),
});

const updateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  fieldKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/).optional(),
  type: z.nativeEnum(FieldType).optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  options: z.array(z.string()).nullable().optional(),
  conditions: z.array(ruleSchema).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: templateId, fieldId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Fetch the existing field early — needed for the immutability guard below
  // and to return a 404 before attempting any write.
  const existingField = await db.formField.findUnique({
    where: { id: fieldId },
    select: { fieldKey: true },
  });
  if (!existingField) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  // fieldKey immutability: once a field is created its key must never change.
  // Changing it would silently break all existing ticket formData payloads that
  // were stored using the original key.
  if (
    parsed.data.fieldKey !== undefined &&
    parsed.data.fieldKey !== existingField.fieldKey
  ) {
    return NextResponse.json(
      {
        error:
          "fieldKey cannot be changed after creation — doing so would break existing ticket form data.",
      },
      { status: 400 }
    );
  }

  const { options, conditions, ...rest } = parsed.data;
  const field = await db.formField.update({
    where: { id: fieldId, templateId },
    data: {
      ...rest,
      ...(options !== undefined ? { options: options ? JSON.stringify(options) : null } : {}),
      ...(conditions !== undefined
        ? { conditions: conditions ? JSON.stringify(conditions) : null }
        : {}),
    },
  });

  return NextResponse.json(field);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: templateId, fieldId } = await params;

  // Load the field being deleted so we know its fieldKey
  const deletedField = await db.formField.findUnique({ where: { id: fieldId } });
  if (!deletedField) return new NextResponse(null, { status: 204 });

  const deletedFieldKey = deletedField.fieldKey;

  // Load sibling fields that might reference this fieldKey in their conditions
  const siblings = await db.formField.findMany({
    where: { templateId, id: { not: fieldId } },
  });

  // Build list of siblings that need their conditions updated
  const affectedSiblings = siblings
    .filter((sibling) => {
      if (!sibling.conditions) return false;
      const rules = JSON.parse(sibling.conditions) as ConditionalRule[];
      return rules.some((r) => r.when.fieldKey === deletedFieldKey);
    })
    .map((sibling) => {
      const rules = JSON.parse(sibling.conditions!) as ConditionalRule[];
      const cleaned = rules.filter((r) => r.when.fieldKey !== deletedFieldKey);
      return {
        id: sibling.id,
        conditions: cleaned.length > 0 ? JSON.stringify(cleaned) : null,
      };
    });

  await db.$transaction(async (tx) => {
    await tx.formField.delete({ where: { id: fieldId } });
    for (const { id: siblingId, conditions } of affectedSiblings) {
      await tx.formField.update({
        where: { id: siblingId },
        data: { conditions },
      });
    }
  });

  return new NextResponse(null, { status: 204 });
}
