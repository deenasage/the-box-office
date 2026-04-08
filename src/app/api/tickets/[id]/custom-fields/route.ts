// SPEC: custom-fields.md
// GET   /api/tickets/[id]/custom-fields — Any authenticated user.
//         Returns all CustomField definitions applicable to this ticket's team (global + team-scoped),
//         merged with the ticket's saved TicketCustomFieldValue rows.
// PATCH /api/tickets/[id]/custom-fields — Authenticated user who is the assignee or an ADMIN.
//         Body: { fieldId: string; value: string } — upserts a TicketCustomFieldValue.
// Response: { data: MergedField[] } | { data: TicketCustomFieldValue } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole, Prisma } from "@prisma/client";

const PatchCustomFieldValueSchema = z.object({
  fieldId: z.string().cuid(),
  value: z.string(),
});

// GET /api/tickets/[id]/custom-fields — any authenticated user
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id: ticketId } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      team: true,
      customFieldValues: {
        select: { id: true, fieldId: true, value: true },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Fetch fields that are either global (teamScope = null) or scoped to this ticket's team
  const fields = await db.customField.findMany({
    where: {
      OR: [
        { teamScope: null },
        { teamScope: ticket.team },
      ],
    },
    orderBy: { order: "asc" },
  });

  // Build a lookup map of fieldId → saved value
  const valueMap = new Map(
    ticket.customFieldValues.map((v) => [v.fieldId, v])
  );

  // Merge: each field definition + its saved value (if any)
  const merged = fields.map((field) => {
    const saved = valueMap.get(field.id);
    return {
      ...field,
      // Parse options back to array for API consumers
      options: field.options ? (JSON.parse(field.options) as string[]) : null,
      savedValue: saved
        ? { id: saved.id, fieldId: saved.fieldId, value: saved.value }
        : null,
    };
  });

  return NextResponse.json({ data: merged });
}

// PATCH /api/tickets/[id]/custom-fields — assignee or ADMIN
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id: ticketId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchCustomFieldValueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fieldId, value } = parsed.data;

  // Fetch ticket to check it exists and to authorise the write
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, team: true, assigneeId: true },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Only the assignee or an ADMIN may write custom field values
  const isAdmin = session.user.role === UserRole.ADMIN;
  const isAssignee = ticket.assigneeId === session.user.id;
  if (!isAdmin && !isAssignee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the field exists and is applicable to this ticket's team
  const field = await db.customField.findUnique({
    where: { id: fieldId },
    select: { id: true, teamScope: true, required: true },
  });

  if (!field) {
    return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
  }

  // Field must be global or scoped to this ticket's team
  if (field.teamScope !== null && field.teamScope !== ticket.team) {
    return NextResponse.json(
      { error: "Custom field is not applicable to this ticket's team" },
      { status: 400 }
    );
  }

  // Required fields cannot be cleared
  if (field.required && value.trim() === "") {
    return NextResponse.json(
      { error: "This custom field is required and cannot be empty" },
      { status: 400 }
    );
  }

  try {
    const upserted = await db.ticketCustomFieldValue.upsert({
      where: { ticketId_fieldId: { ticketId, fieldId } },
      create: { ticketId, fieldId, value },
      update: { value },
    });

    return NextResponse.json({ data: upserted });
  } catch (e) {
    console.error("[PATCH /api/tickets/:id/custom-fields] error:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json({ error: "Invalid ticket or field reference" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save custom field value" }, { status: 500 });
  }
}
