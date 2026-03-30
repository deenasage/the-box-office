// SPEC: ai-estimation.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const estimates = await db.aIEstimate.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    estimates.map((e) => ({
      ...e,
      flags: e.flags ? JSON.parse(e.flags) : [],
      similarTickets: e.similarTickets ? JSON.parse(e.similarTickets) : [],
    }))
  );
}
