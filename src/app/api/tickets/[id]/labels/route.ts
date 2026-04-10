// SPEC: labels.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  labelIds: z.array(z.string()),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    const rows = await db.ticketLabel.findMany({
      where: { ticketId: id },
      select: { label: { select: { id: true, name: true, color: true } } },
    });
    return NextResponse.json({ data: rows.map((r) => r.label) });
  } catch (err) {
    console.error("[GET /api/tickets/[id]/labels]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.ticketLabel.deleteMany({ where: { ticketId: id } });
      if (parsed.data.labelIds.length > 0) {
        await tx.ticketLabel.createMany({
          data: parsed.data.labelIds.map((labelId) => ({ ticketId: id, labelId })),
        });
      }
    });
    const labels = await db.label.findMany({
      where: { tickets: { some: { ticketId: id } } },
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json({ data: labels });
  } catch (err) {
    console.error("[PUT /api/tickets/[id]/labels]", err);
    return NextResponse.json({ error: "Failed to update labels" }, { status: 500 });
  }
}
