// SPEC: sprint-scrum.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole, TicketStatus, EntityType } from "@prisma/client";

interface SprintPayload {
  id: string;
  name: string;
  notes?: string | null;
  startDate: string;
  endDate: string;
  committedPoints?: number | null;
  retrospectiveNotes?: string | null;
}

interface TicketPayload {
  id: string;
  title: string;
  description?: string | null;
  team: string;
  size?: string | null;
  dueDate?: string | null;
  priority?: number;
  isPriority?: boolean;
  formData: string;
  templateId?: string | null;
  assigneeId?: string | null;
  creatorId: string;
  epicId?: string | null;
  briefId?: string | null;
}

// POST /api/admin/deletion-log/[id]/restore — ADMIN only.
// Re-creates the deleted entity from its payload snapshot.
// For sprints: always created as inactive. Uses original entityId.
// For tickets: status is forced to BACKLOG. Uses original entityId.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const log = await db.deletionLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (log.restoredAt) {
    return NextResponse.json(
      { error: "This entry has already been restored" },
      { status: 409 }
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(log.payload);
  } catch {
    return NextResponse.json(
      { error: "Stored payload is not valid JSON" },
      { status: 500 }
    );
  }

  let restoredEntityId: string;

  if (log.entityType === EntityType.SPRINT) {
    const p = payload as SprintPayload;

    // Upsert using the original id so any future references remain valid.
    // Create as inactive regardless of original state.
    const sprint = await db.sprint.upsert({
      where: { id: log.entityId },
      create: {
        id: log.entityId,
        name: p.name,
        notes: p.notes ?? null,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        isActive: false,
        committedPoints: p.committedPoints ?? null,
        retrospectiveNotes: p.retrospectiveNotes ?? null,
      },
      update: {
        name: p.name,
        notes: p.notes ?? null,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        isActive: false,
        committedPoints: p.committedPoints ?? null,
        retrospectiveNotes: p.retrospectiveNotes ?? null,
      },
    });
    restoredEntityId = sprint.id;
  } else if (log.entityType === EntityType.TICKET) {
    const p = payload as TicketPayload;

    const ticket = await db.ticket.upsert({
      where: { id: log.entityId },
      create: {
        id: log.entityId,
        title: p.title,
        description: p.description ?? null,
        team: p.team as never,
        status: TicketStatus.BACKLOG,
        size: p.size as never ?? null,
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
        priority: p.priority ?? 0,
        isPriority: p.isPriority ?? false,
        formData: p.formData,
        templateId: p.templateId ?? null,
        assigneeId: p.assigneeId ?? null,
        creatorId: p.creatorId,
        sprintId: null,
        epicId: p.epicId ?? null,
        briefId: p.briefId ?? null,
      },
      update: {
        title: p.title,
        description: p.description ?? null,
        team: p.team as never,
        status: TicketStatus.BACKLOG,
        size: p.size as never ?? null,
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
        priority: p.priority ?? 0,
        isPriority: p.isPriority ?? false,
        formData: p.formData,
        templateId: p.templateId ?? null,
        assigneeId: p.assigneeId ?? null,
        creatorId: p.creatorId,
        sprintId: null,
        epicId: p.epicId ?? null,
        briefId: p.briefId ?? null,
      },
    });
    restoredEntityId = ticket.id;
  } else {
    return NextResponse.json(
      { error: `Unknown entityType: ${log.entityType}` },
      { status: 400 }
    );
  }

  // Mark the log entry as restored
  await db.deletionLog.update({
    where: { id },
    data: {
      restoredAt: new Date(),
      restoredById: session.user.id,
    },
  });

  return NextResponse.json({ data: { id: restoredEntityId } });
}
