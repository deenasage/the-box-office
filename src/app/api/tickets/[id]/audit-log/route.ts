// GET /api/tickets/[id]/audit-log — returns field-change audit entries, oldest first.
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = await db.ticketAuditLog.findMany({
    where: { ticketId: id },
    orderBy: { changedAt: "asc" },
    include: { changedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ data: entries });
}
