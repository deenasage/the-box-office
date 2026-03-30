// Returns the currently active form template with its fields.
// Used by the ticket create form to mirror the intake form questions.
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const template = await db.formTemplate.findFirst({
      where: { isActive: true },
      include: { fields: { orderBy: { order: "asc" } } },
    });

    if (!template) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: template });
  } catch (err) {
    console.error("[GET /api/form-templates/active]", err);
    return NextResponse.json({ error: "Failed to load form template" }, { status: 500 });
  }
}
