// SPEC: brief-to-epic-workflow.md
// GET  /api/sprints/[id]/carryover — any authenticated user
//   Returns all PENDING SprintCarryoverSuggestion records for the sprint,
//   with ticket title/team/status included.
//   Response: { data: SprintCarryoverSuggestion[] }
//
// PATCH /api/sprints/[id]/carryover — ADMIN or TEAM_LEAD only
//   Accepts or dismisses a single carryover suggestion.
//   Body: { suggestionId: string, action: "ACCEPT" | "DISMISS", toSprintId?: string }
//   ACCEPT  → status: ACCEPTED, assign ticket to toSprintId (if provided), record resolver
//   DISMISS → status: DISMISSED, leave ticket in backlog, record resolver
//   Response: { data: SprintCarryoverSuggestion }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { UserRole, CarryoverStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Verify sprint exists
  const sprint = await db.sprint.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!sprint) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }

  const suggestions = await db.sprintCarryoverSuggestion.findMany({
    where: {
      fromSprintId: id,
      status: CarryoverStatus.PENDING,
    },
    include: {
      ticket: {
        select: {
          id: true,
          title: true,
          team: true,
          status: true,
          size: true,
          priority: true,
        },
      },
      toSprint: {
        select: { id: true, name: true, startDate: true, endDate: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: suggestions });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

const patchSchema = z.object({
  suggestionId: z.string().cuid(),
  action: z.enum(["ACCEPT", "DISMISS"]),
  toSprintId: z.string().cuid().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    !isPrivileged(session.user.role as UserRole)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { suggestionId, action, toSprintId } = parsed.data;

  // Verify the suggestion belongs to this sprint
  const suggestion = await db.sprintCarryoverSuggestion.findFirst({
    where: { id: suggestionId, fromSprintId: id },
    select: { id: true, status: true, ticketId: true },
  });

  if (!suggestion) {
    return NextResponse.json({ error: "Carryover suggestion not found" }, { status: 404 });
  }

  if (suggestion.status !== CarryoverStatus.PENDING) {
    return NextResponse.json(
      { error: `Suggestion is already ${suggestion.status.toLowerCase()}` },
      { status: 409 }
    );
  }

  // If accepting and toSprintId is provided, verify the target sprint exists
  if (action === "ACCEPT" && toSprintId) {
    const targetSprint = await db.sprint.findUnique({
      where: { id: toSprintId },
      select: { id: true },
    });
    if (!targetSprint) {
      return NextResponse.json({ error: "Target sprint not found" }, { status: 404 });
    }
  }

  const now = new Date();

  let updated;
  try {
    updated = await db.$transaction(async (tx) => {
      if (action === "ACCEPT") {
        // Optionally assign ticket to the target sprint
        if (toSprintId) {
          await tx.ticket.update({
            where: { id: suggestion.ticketId },
            data: { sprintId: toSprintId },
          });
        }

        return tx.sprintCarryoverSuggestion.update({
          where: { id: suggestionId },
          data: {
            status: CarryoverStatus.ACCEPTED,
            toSprintId: toSprintId ?? undefined,
            resolvedByUserId: session.user.id,
            resolvedAt: now,
          },
          include: {
            ticket: {
              select: {
                id: true,
                title: true,
                team: true,
                status: true,
                size: true,
                priority: true,
              },
            },
          },
        });
      } else {
        // DISMISS — leave ticket in backlog, just record resolution
        return tx.sprintCarryoverSuggestion.update({
          where: { id: suggestionId },
          data: {
            status: CarryoverStatus.DISMISSED,
            resolvedByUserId: session.user.id,
            resolvedAt: now,
          },
          include: {
            ticket: {
              select: {
                id: true,
                title: true,
                team: true,
                status: true,
                size: true,
                priority: true,
              },
            },
          },
        });
      }
    });
  } catch (err) {
    console.error("[PATCH /api/sprints/[id]/carryover]", err);
    return NextResponse.json({ error: "Failed to update carryover suggestion" }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}
