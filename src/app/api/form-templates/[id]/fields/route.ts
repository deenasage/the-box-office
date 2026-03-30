// SPEC: form-builder.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole, FieldType } from "@prisma/client";

const ruleSchema = z.object({
  when: z.object({
    fieldKey: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
    value: z.string().optional(),
  }),
  action: z.enum(["show", "hide", "require"]),
});

const createSchema = z.object({
  label: z.string().min(1).max(200),
  fieldKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  type: z.nativeEnum(FieldType),
  required: z.boolean().optional(),
  order: z.number().int().min(0),
  options: z.array(z.string()).optional(),
  conditions: z.array(ruleSchema).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const fields = await db.formField.findMany({
    where: { templateId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(fields);
}

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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { options, conditions, ...rest } = parsed.data;
  const field = await db.formField.create({
    data: {
      ...rest,
      templateId,
      options: options ? JSON.stringify(options) : null,
      conditions: conditions ? JSON.stringify(conditions) : null,
    },
  });

  return NextResponse.json(field, { status: 201 });
}
