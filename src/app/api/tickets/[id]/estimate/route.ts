// SPEC: ai-estimation.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { TicketStatus } from "@prisma/client";
import { findSimilarTickets } from "@/lib/ai/estimation-context";
import { estimateTicket } from "@/lib/ai/estimator";

const DEBOUNCE_MINUTES = 5;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { id: true, title: true, description: true, team: true },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Debounce: reject if a recent estimate already exists
  const debounceWindow = new Date(Date.now() - DEBOUNCE_MINUTES * 60 * 1000);
  const recent = await db.aIEstimate.findFirst({
    where: { ticketId: id, createdAt: { gte: debounceWindow } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    return NextResponse.json(
      { error: `An estimate was already requested in the last ${DEBOUNCE_MINUTES} minutes.` },
      { status: 409 }
    );
  }

  // Fetch historical DONE + sized tickets from the same team
  const historical = await db.ticket.findMany({
    where: { team: ticket.team, status: TicketStatus.DONE, size: { not: null } },
    select: { id: true, title: true, description: true, team: true, size: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const similar = findSimilarTickets(ticket, historical);

  const result = await estimateTicket(ticket, similar);

  const estimate = await db.aIEstimate.create({
    data: {
      ticketId: id,
      suggestedSize: result.suggestedSize,
      confidence: result.confidence,
      rationale: result.rationale,
      flags: JSON.stringify(result.flags),
      similarTickets: JSON.stringify(similar.map((t) => t.id)),
      aiPromptTokens: result.promptTokens,
      aiOutputTokens: result.outputTokens,
    },
  });

  return NextResponse.json({
    ...estimate,
    flags: result.flags,
    similarTickets: similar.map((t) => ({ id: t.id, title: t.title, size: t.size })),
  });
}
