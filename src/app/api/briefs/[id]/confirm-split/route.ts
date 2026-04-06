// SPEC: brief-to-epic-workflow.md
// Phase 3 — Accept a PM-reviewed split and persist Epic, Tickets, and TicketDependency records.
// POST /api/briefs/[id]/confirm-split
// Auth: ADMIN or TEAM_LEAD
// Brief must be in APPROVED status and must not already have an epicId
// All writes happen in a single $transaction (function-based — required for libsql)
// Response: { data: { epicId, ticketIds, message } }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import {
  BriefStatus,
  DependencyType,
  DetectionMethod,
  EpicStatus,
  Team,
  TicketSize,
  TicketStatus,
  UserRole,
} from "@prisma/client";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const TeamEnum = z.enum(["CONTENT", "DESIGN", "SEO", "WEM"]);
const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const EpicInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  estimatedStartDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
});

const TicketInputSchema = z.object({
  tempId: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  team: TeamEnum,
  storyPoints: z.number().int().min(1),
  priority: PriorityEnum,
  dependsOn: z.array(z.string()),
});

const ConfirmSplitSchema = z.object({
  epic: EpicInputSchema,
  tickets: z.array(TicketInputSchema).min(1),
});

// ── Mapping helpers ────────────────────────────────────────────────────────────

/** Maps story points to the closest TicketSize enum value. */
function storyPointsToSize(points: number): TicketSize {
  if (points <= 2) return TicketSize.XS;
  if (points <= 4) return TicketSize.S;
  if (points <= 6) return TicketSize.M;
  if (points <= 16) return TicketSize.L;
  if (points <= 30) return TicketSize.XL;
  return TicketSize.XXL;
}

/** Maps priority string to Ticket.priority integer (0=none,1=low,2=medium,3=high). */
function priorityToInt(priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"): number {
  switch (priority) {
    case "LOW":    return 1;
    case "MEDIUM": return 2;
    case "HIGH":   return 3;
    case "URGENT": return 3; // No URGENT level in schema — map to HIGH (3)
  }
}

/** Maps team string to Team enum. Guaranteed safe because Zod has already validated. */
function teamStringToEnum(team: "CONTENT" | "DESIGN" | "SEO" | "WEM"): Team {
  return Team[team as keyof typeof Team];
}

/**
 * Safely parses a YYYY-MM-DD date string.
 * Returns the parsed Date or null if the string is absent/invalid.
 */
function parseDateString(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Formats a Date as "YYYY-MM" for the RoadmapItem.period field. */
function formatPeriod(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const isAdminOrLead =
    session.user.role === UserRole.ADMIN ||
    isTeamLead(session.user.role as UserRole);

  if (!isAdminOrLead) {
    return NextResponse.json(
      { error: "Forbidden — admin or team lead required" },
      { status: 403 }
    );
  }

  const { id: briefId } = await params;

  // ── Parse and validate request body ─────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = ConfirmSplitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { epic: epicInput, tickets: ticketInputs } = parsed.data;

  // ── Pre-flight checks ────────────────────────────────────────────────────────
  const brief = await db.brief.findUnique({ where: { id: briefId } });
  if (!brief) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  if (brief.status !== BriefStatus.APPROVED) {
    return NextResponse.json(
      { error: "Brief must be in APPROVED status to confirm a split" },
      { status: 400 }
    );
  }

  if (brief.epicId) {
    return NextResponse.json(
      { error: "This brief already has an epic — cannot confirm split again" },
      { status: 409 }
    );
  }

  // Validate that dependsOn references only tempIds present in the submission
  const tempIdSet = new Set(ticketInputs.map((t) => t.tempId));
  for (const ticket of ticketInputs) {
    for (const dep of ticket.dependsOn) {
      if (!tempIdSet.has(dep)) {
        return NextResponse.json(
          { error: `Ticket "${ticket.tempId}" depends on unknown tempId "${dep}"` },
          { status: 400 }
        );
      }
      if (dep === ticket.tempId) {
        return NextResponse.json(
          { error: `Ticket "${ticket.tempId}" cannot depend on itself` },
          { status: 400 }
        );
      }
    }
  }

  // ── Date preparation ─────────────────────────────────────────────────────────
  const startDate = parseDateString(epicInput.estimatedStartDate);
  const endDate = parseDateString(epicInput.estimatedEndDate);

  if (!startDate) {
    // Use today as a fallback — log the warning but do not block
    console.warn(
      `[confirm-split] briefId=${briefId}: estimatedStartDate missing or invalid — defaulting to today`
    );
  }

  const resolvedStartDate = startDate ?? new Date();

  // ── Transaction ──────────────────────────────────────────────────────────────
  let epicId: string;
  let createdTicketIds: string[];

  try {
    const result = await db.$transaction(async (tx) => {
      // Step 1 — Create the Epic
      const epic = await tx.epic.create({
        data: {
          name: epicInput.title,
          description: epicInput.description,
          status: EpicStatus.IN_PLANNING,
          startDate: resolvedStartDate,
          endDate: endDate ?? undefined,
        },
      });

      // Step 2 — Link Brief to Epic and update Brief status
      await tx.brief.update({
        where: { id: briefId },
        data: {
          epicId: epic.id,
          status: BriefStatus.FINALIZED,
        },
      });

      // Step 3 — Create Tickets and build tempId → real id map
      const tempIdToRealId = new Map<string, string>();
      const ticketIds: string[] = [];

      for (const ticketInput of ticketInputs) {
        const ticket = await tx.ticket.create({
          data: {
            title: ticketInput.title,
            description: ticketInput.description,
            team: teamStringToEnum(ticketInput.team),
            status: TicketStatus.BACKLOG,
            size: storyPointsToSize(ticketInput.storyPoints),
            priority: priorityToInt(ticketInput.priority),
            formData: JSON.stringify({}),
            epicId: epic.id,
            briefId: brief.id,
            creatorId: session.user.id,
          },
        });

        tempIdToRealId.set(ticketInput.tempId, ticket.id);
        ticketIds.push(ticket.id);
      }

      // Step 4 — Create TicketDependency records using the resolved real IDs
      // For each dependency pair, create both a BLOCKS and a BLOCKED_BY record
      // (spec: "create two TicketDependency records per pair")
      for (const ticketInput of ticketInputs) {
        const toId = tempIdToRealId.get(ticketInput.tempId);
        if (!toId) continue; // should never happen — all tickets were just created

        for (const depTempId of ticketInput.dependsOn) {
          const fromId = tempIdToRealId.get(depTempId);
          if (!fromId) continue; // guarded above in pre-flight checks

          // fromTicket BLOCKS toTicket
          await tx.ticketDependency.create({
            data: {
              fromTicketId: fromId,
              toTicketId: toId,
              type: DependencyType.BLOCKS,
              detectedBy: DetectionMethod.AI,
              createdBy: session.user.id,
            },
          });

          // toTicket BLOCKED_BY fromTicket
          await tx.ticketDependency.create({
            data: {
              fromTicketId: toId,
              toTicketId: fromId,
              type: DependencyType.BLOCKED_BY,
              detectedBy: DetectionMethod.AI,
              createdBy: session.user.id,
            },
          });
        }
      }

      // Step 5 — Create a RoadmapItem if the epic has an endDate
      if (endDate) {
        const existingRoadmapItem = await tx.roadmapItem.findFirst({
          where: { epicId: epic.id },
        });

        if (!existingRoadmapItem) {
          await tx.roadmapItem.create({
            data: {
              epicId: epic.id,
              title: epicInput.title,
              period: formatPeriod(endDate),
              status: "NOT_STARTED",
              startDate: resolvedStartDate,
              endDate: endDate,
            },
          });
        }
      }

      return { epicId: epic.id, ticketIds };
    });

    epicId = result.epicId;
    createdTicketIds = result.ticketIds;
  } catch (txErr) {
    console.error("[confirm-split] Transaction failed:", txErr);
    return NextResponse.json(
      { error: "Failed to create epic and tickets — please try again" },
      { status: 500 }
    );
  }

  // Summarise unique teams for the success message
  const uniqueTeams = new Set(ticketInputs.map((t) => t.team));

  return NextResponse.json(
    {
      data: {
        epicId,
        ticketIds: createdTicketIds,
        message: `Created ${createdTicketIds.length} ticket${createdTicketIds.length !== 1 ? "s" : ""} across ${uniqueTeams.size} team${uniqueTeams.size !== 1 ? "s" : ""}`,
      },
    },
    { status: 201 }
  );
}
