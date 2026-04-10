// SPEC: capacity-ai.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { z } from "zod";
import { buildCapacityContext, getUpcomingSprints } from "@/lib/ai/capacity-context";
import { suggestSprintPlacement } from "@/lib/ai/sprint-planner";
import { Team, TicketSize } from "@prisma/client";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  ticketIds: z.array(z.string()).min(1),
  sprintCount: z.number().int().min(1).max(6).optional().default(3),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ticketIds, sprintCount } = parsed.data;

  const tickets = await db.ticket.findMany({
    where: { id: { in: ticketIds } },
    select: { id: true, title: true, team: true, size: true },
  });
  if (tickets.length === 0) {
    return NextResponse.json({ error: "No valid tickets found." }, { status: 400 });
  }

  const upcomingSprints = await getUpcomingSprints(sprintCount);
  if (upcomingSprints.length === 0) {
    return NextResponse.json(
      { error: "No upcoming sprints found. Create a sprint before requesting placement suggestions." },
      { status: 400 }
    );
  }

  const sprintIds = upcomingSprints.map((s) => s.id);
  const incomingTickets = tickets.map((t) => ({
    team: t.team as Team,
    size: t.size as TicketSize | null,
  }));
  const capacityContext = await buildCapacityContext(sprintIds, incomingTickets);

  const result = await suggestSprintPlacement(
    tickets.map((t) => ({
      team: t.team as Team,
      size: t.size as TicketSize | null,
      title: t.title,
    })),
    capacityContext
  );

  const suggestion = await db.sprintSuggestion.create({
    data: {
      ticketIds: JSON.stringify(tickets.map((t) => t.id)),
      scenarios: JSON.stringify(result.scenarios),
      recommendation: result.recommendation
        ? JSON.stringify(result.recommendation)
        : null,
      aiPromptTokens: result.promptTokens,
      aiOutputTokens: result.outputTokens,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json({
    id: suggestion.id,
    scenarios: result.scenarios,
    recommendation: result.recommendation,
    ticketCount: tickets.length,
    sprintsEvaluated: sprintIds.length,
  });
}
