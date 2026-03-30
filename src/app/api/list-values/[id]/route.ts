// SPEC: admin-lists.md
// PATCH  /api/list-values/[id]   — updates value and/or sortOrder on a ListValue; ADMIN only
// DELETE /api/list-values/[id]   — deletes a ListValue; ADMIN only; returns 204
// Auth required for all methods; ADMIN role required
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

const UpdateListValueSchema = z.object({
  value: z.string().min(1).max(255).optional(),
  sortOrder: z.number().int().optional(),
});

// PATCH /api/list-values/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(UserRole.ADMIN);
  if (error) return error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateListValueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  if (parsed.data.value === undefined && parsed.data.sortOrder === undefined) {
    return NextResponse.json(
      { error: "At least one of value or sortOrder must be provided" },
      { status: 400 }
    );
  }

  try {
    const existing = await db.listValue.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.listValue.update({
      where: { id },
      data: {
        ...(parsed.data.value !== undefined ? { value: parsed.data.value } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      },
    });
    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    // Prisma unique constraint violation — P2002 (duplicate [listKey, value])
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A list value with that name already exists for this list key" },
        { status: 409 }
      );
    }
    console.error("[PATCH /api/list-values/[id]]", err);
    return NextResponse.json({ error: "Failed to update list value" }, { status: 500 });
  }
}

// DELETE /api/list-values/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(UserRole.ADMIN);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.listValue.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.listValue.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/list-values/[id]]", err);
    return NextResponse.json({ error: "Failed to delete list value" }, { status: 500 });
  }
}
