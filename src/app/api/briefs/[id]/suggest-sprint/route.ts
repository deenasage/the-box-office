// SPEC: capacity-ai.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { buildCapacityContext, getUpcomingSprints } from "@/lib/ai/capacity-context";
import { suggestSprintPlacement } from "@/lib/ai/sprint-planner";
import { Team, TicketSize } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const brief = await db.brief.findUnique({
    where: { id },
    include: {
      tickets: { select: { id: true, title: true, team: true, size: true } },
    },
  });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (brief.tickets.length === 0) {
    return NextResponse.json(
      { error: "No tickets linked to this brief — generate tickets first." },
      { status: 400 }
    );
  }

  const upcomingSprints = await getUpcomingSprints(3);
  if (upcomingSprints.length === 0) {
    return NextResponse.json(
      { error: "No upcoming sprints found. Create a sprint before requesting placement suggestions." },
      { status: 400 }
    );
  }

  const sprintIds = upcomingSprints.map((s) => s.id);
  const incomingTickets = brief.tickets.map((t) => ({
    team: t.team as Team,
    size: t.size as TicketSize | null,
  }));
  const capacityContext = await buildCapacityContext(sprintIds, incomingTickets);

  const result = await suggestSprintPlacement(
    brief.tickets.map((t) => ({
      team: t.team as Team,
      size: t.size as TicketSize | null,
      title: t.title,
    })),
    capacityContext
  );

  const suggestion = await db.sprintSuggestion.create({
    data: {
      briefId: id,
      ticketIds: JSON.stringify(brief.tickets.map((t) => t.id)),
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
    ticketCount: brief.tickets.length,
    sprintsEvaluated: sprintIds.length,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const suggestions = await db.sprintSuggestion.findMany({
    where: { briefId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    suggestions.map((s) => ({
      ...s,
      ticketIds: JSON.parse(s.ticketIds),
      scenarios: JSON.parse(s.scenarios),
      recommendation: s.recommendation ? JSON.parse(s.recommendation) : null,
    }))
  );
}
