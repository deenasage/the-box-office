// SPEC: sprints.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { UserRole, EntityType } from "@prisma/client";
import { createNotifications } from "@/lib/notify-users";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).nullable().optional(),
  notes: z.string().nullable().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  retrospectiveNotes: z.string().nullable().optional(),
  retroActionItems: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const sprint = await db.sprint.findUnique({
    where: { id },
    include: {
      tickets: {
        select: {
          id: true, title: true, status: true, size: true, team: true,
          priority: true, dueDate: true, assigneeId: true, epicId: true,
          creatorId: true, sprintId: true, labels: { select: { label: { select: { name: true, color: true } } } },
          assignee: { select: { id: true, name: true, team: true } },
          epic: { select: { id: true, name: true, color: true } },
        },
        orderBy: { priority: "desc" },
      },
      capacities: {
        include: { user: { select: { id: true, name: true, team: true } } },
      },
    },
  });

  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sprint);
}

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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate);
  if (parsed.data.endDate) data.endDate = new Date(parsed.data.endDate);

  // Fetch the current sprint state before mutation so we can read the name
  // and determine if this is a completion (isActive: true → false) for notifications.
  const currentSprint =
    parsed.data.isActive === false
      ? await db.sprint.findUnique({
          where: { id },
          select: {
            name: true,
            isActive: true,
            tickets: { select: { creatorId: true, assigneeId: true } },
          },
        })
      : null;

  // When activating a sprint, deactivate any currently active sprint first (one active at a time)
  let sprint;
  if (parsed.data.isActive === true) {
    sprint = await db.$transaction(async (tx) => {
      await tx.sprint.updateMany({ where: { isActive: true, id: { not: id } }, data: { isActive: false } });
      return tx.sprint.update({ where: { id }, data });
    });
  } else {
    sprint = await db.sprint.update({ where: { id }, data });
  }

  // When completing a sprint (isActive: true → false), notify all affected users once each
  if (
    parsed.data.isActive === false &&
    currentSprint?.isActive === true &&
    currentSprint.tickets.length > 0
  ) {
    const userIds = [
      ...new Set(
        currentSprint.tickets.flatMap((t) =>
          [t.creatorId, t.assigneeId].filter((uid): uid is string => uid !== null)
        )
      ),
    ];
    void createNotifications(
      userIds.map((userId) => ({
        userId,
        message: `Sprint '${currentSprint.name}' has been completed`,
        link: `/sprints/${id}`,
      }))
    );
  }

  return NextResponse.json(sprint);
}

// DELETE /api/sprints/[id] — ADMIN only.
// Active sprints cannot be deleted.
// Tickets assigned to the sprint are moved back to the backlog (sprintId: null)
// in the same transaction as the sprint deletion. A DeletionLog entry is written.
// Response: 204 | { error: string }
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const sprint = await db.sprint.findUnique({
    where: { id },
    include: { tickets: true, capacities: true },
  });
  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (sprint.isActive) {
    return NextResponse.json(
      { error: "Cannot delete an active sprint" },
      { status: 400 }
    );
  }

  const ticketCount = sprint.tickets.length;

  try {
    // Use function-based transaction for libsql compatibility
    await db.$transaction(async (tx) => {
      // Move all sprint tickets back to backlog first (clears FK reference)
      await tx.ticket.updateMany({
        where: { sprintId: id },
        data: { sprintId: null },
      });
      // Write the deletion log
      await tx.deletionLog.create({
        data: {
          entityType: EntityType.SPRINT,
          entityId: id,
          entityTitle: sprint.name,
          deletedById: session.user.id,
          payload: JSON.stringify({
            id: sprint.id,
            name: sprint.name,
            notes: sprint.notes,
            startDate: sprint.startDate.toISOString(),
            endDate: sprint.endDate.toISOString(),
            committedPoints: sprint.committedPoints,
            retrospectiveNotes: sprint.retrospectiveNotes,
            createdAt: sprint.createdAt.toISOString(),
            updatedAt: sprint.updatedAt.toISOString(),
          }),
          ticketCount,
        },
      });
      // Delete the sprint (cascades TeamCapacity via onDelete: Cascade)
      await tx.sprint.delete({ where: { id } });
    });
  } catch (err) {
    console.error("[DELETE /api/sprints/[id]]", err);
    return NextResponse.json({ error: "Failed to delete sprint" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
