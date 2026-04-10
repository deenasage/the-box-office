// SPEC: ai-estimation.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { TicketStatus, UserRole } from "@prisma/client";
import { findSimilarTickets } from "@/lib/ai/estimation-context";
import { estimateTicket } from "@/lib/ai/estimator";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { role } = session.user;
  if (role !== UserRole.ADMIN && !isTeamLead(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const sprint = await db.sprint.findUnique({ where: { id }, select: { id: true } });
  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find unsized tickets in this sprint
  const unsized = await db.ticket.findMany({
    where: { sprintId: id, size: null },
    select: { id: true, title: true, description: true, team: true },
  });

  if (unsized.length === 0) {
    return NextResponse.json({ estimated: 0, results: [] });
  }

  // Load all DONE + sized tickets once (for similarity lookup)
  const historical = await db.ticket.findMany({
    where: { status: TicketStatus.DONE, size: { not: null } },
    select: { id: true, title: true, description: true, team: true, size: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const results: { ticketId: string; title: string; suggestedSize: string; confidence: number; estimateId: string }[] = [];
  const errors: { ticketId: string; title: string; error: string }[] = [];

  // Run sequentially to avoid hammering the API
  for (const ticket of unsized) {
    try {
      const similar = findSimilarTickets(ticket, historical);
      const result = await estimateTicket(ticket, similar);

      const estimate = await db.aIEstimate.create({
        data: {
          ticketId: ticket.id,
          suggestedSize: result.suggestedSize,
          confidence: result.confidence,
          rationale: result.rationale,
          flags: JSON.stringify(result.flags),
          similarTickets: JSON.stringify(similar.map((t) => t.id)),
          aiPromptTokens: result.promptTokens,
          aiOutputTokens: result.outputTokens,
        },
      });

      results.push({
        ticketId: ticket.id,
        title: ticket.title,
        suggestedSize: result.suggestedSize,
        confidence: result.confidence,
        estimateId: estimate.id,
      });
    } catch (err) {
      errors.push({
        ticketId: ticket.id,
        title: ticket.title,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    estimated: results.length,
    failed: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
