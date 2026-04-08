// SPEC: custom-fields.md
// POST /api/admin/custom-fields/reorder — ADMIN only.
// Body: { ids: string[] } — reorders fields by setting `order` equal to each id's index position.
// Uses a $transaction to apply all updates atomically (function-based, required for libsql).
// Response: { data: { reordered: number } } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

const ReorderSchema = z.object({
  ids: z.array(z.string().cuid()).min(1),
});

// POST /api/admin/custom-fields/reorder — ADMIN only
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ids } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.customField.update({
          where: { id: ids[i] },
          data: { order: i },
        });
      }
    });
  } catch (e) {
    console.error("[POST /api/admin/custom-fields/reorder] error:", e);
    return NextResponse.json({ error: "Failed to reorder custom fields" }, { status: 500 });
  }

  return NextResponse.json({ data: { reordered: ids.length } });
}
