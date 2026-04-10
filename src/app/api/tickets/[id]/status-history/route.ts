// SPEC: tickets.md
// GET /api/tickets/[id]/status-history — Auth: any authenticated.
// Returns the full status transition history for a ticket, ordered oldest-first.
// Response: { data: TicketStatusHistory[] } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Verify the ticket exists first
  const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const history = await db.ticketStatusHistory.findMany({
    where: { ticketId: id },
    orderBy: { changedAt: "asc" },
    include: {
      changedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: history });
}
