// SPEC: smart-tickets.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { BriefStatus, GenerationStatus, TicketStatus, UserRole } from "@prisma/client";
import { generateTicketsFromBrief } from "@/lib/ai/ticket-generator";
import { parseJsonSafe } from "@/lib/utils";

function canMutate(
  session: { user: { id: string; role: UserRole } },
  creatorId: string
) {
  return (
    session.user.id === creatorId ||
    session.user.role === UserRole.ADMIN ||
    isTeamLead(session.user.role as UserRole)
  );
}

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
      generationJobs: {
        where: { status: GenerationStatus.RUNNING },
        take: 1,
      },
    },
  });

  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canMutate(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (brief.status !== BriefStatus.FINALIZED) {
    return NextResponse.json(
      { error: "Brief must be FINALIZED to generate tickets." },
      { status: 400 }
    );
  }
  if (brief.generationJobs.length > 0) {
    return NextResponse.json(
      { error: "Ticket generation is already in progress." },
      { status: 409 }
    );
  }

  const requiredTeams = parseJsonSafe<string[]>(brief.requiredTeams, []);
  if (requiredTeams.length === 0) {
    return NextResponse.json(
      { error: "Brief has no required teams — cannot generate tickets." },
      { status: 400 }
    );
  }

  // Check for existing tickets from this brief (warn, but allow re-generation)
  const existingCount = await db.ticket.count({ where: { briefId: id } });

  // Create the job record immediately
  const job = await db.ticketGenerationJob.create({
    data: {
      briefId: id,
      status: GenerationStatus.RUNNING,
    },
  });

  try {
    const result = await generateTicketsFromBrief({
      title: brief.title,
      objective: brief.objective,
      targetAudience: brief.targetAudience,
      deliverables: parseJsonSafe<string[]>(brief.deliverables, []),
      dependencies: parseJsonSafe<string[]>(brief.dependencies, []),
      requiredTeams,
      timeline: brief.timeline,
      successMetrics: parseJsonSafe<string[]>(brief.successMetrics, []),
    });

    // Create all tickets in a transaction
    const teamResults: { team: string; status: string; ticketId: string | null; reason: string | null }[] = [];

    await db.$transaction(async (tx) => {
      for (const draft of result.tickets) {
        const ticket = await tx.ticket.create({
          data: {
            title: draft.title,
            description: draft.description,
            team: draft.team,
            status: TicketStatus.BACKLOG,
            size: draft.suggestedSize,
            priority: 0,
            formData: "{}",
            briefId: id,
            epicId: brief.epicId ?? undefined,
            creatorId: session.user.id,
          },
        });
        teamResults.push({
          team: draft.team,
          status: "CREATED",
          ticketId: ticket.id,
          reason: null,
        });
      }
    });

    await db.ticketGenerationJob.update({
      where: { id: job.id },
      data: {
        status: GenerationStatus.DONE,
        teamResults: JSON.stringify(teamResults),
        aiPromptTokens: result.promptTokens,
        aiOutputTokens: result.outputTokens,
      },
    });

    return NextResponse.json({
      jobId: job.id,
      ticketsCreated: teamResults.length,
      existingTicketsWarning: existingCount > 0
        ? `${existingCount} previous ticket(s) from this brief still exist and were not deleted.`
        : null,
      teamResults,
    });
  } catch (err) {
    await db.ticketGenerationJob.update({
      where: { id: job.id },
      data: {
        status: GenerationStatus.FAILED,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
    console.error("Ticket generation failed:", err);
    return NextResponse.json(
      { error: "Ticket generation failed — please try again." },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const jobs = await db.ticketGenerationJob.findMany({
    where: { briefId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}
