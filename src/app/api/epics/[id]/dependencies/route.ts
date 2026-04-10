// SPEC: dependencies.md
// GET /api/epics/[id]/dependencies — Any authenticated
// Returns { tickets, dependencies, sequencingWarnings } for all tickets in an epic
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { detectSequencingWarnings } from "@/lib/dependencies";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Verify epic exists
  const epic = await db.epic.findUnique({ where: { id }, select: { id: true } });
  if (!epic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch all tickets in the epic with sprint info for sequencing warnings
  const tickets = await db.ticket.findMany({
    where: { epicId: id },
    select: {
      id: true,
      title: true,
      team: true,
      status: true,
      size: true,
      sprintId: true,
      sprint: { select: { id: true, name: true, startDate: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (tickets.length === 0) {
    return NextResponse.json({
      data: { tickets: [], dependencies: [], sequencingWarnings: [] },
    });
  }

  const ticketIds = tickets.map((t) => t.id);

  // Fetch all dependencies where BOTH tickets are in this epic's ticket set
  const allDependencies = await db.ticketDependency.findMany({
    where: {
      fromTicketId: { in: ticketIds },
      toTicketId: { in: ticketIds },
    },
    include: {
      fromTicket: { select: { id: true, title: true, team: true, status: true } },
      toTicket: { select: { id: true, title: true, team: true, status: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Build ticket map for sequencing warning computation
  const ticketMap = new Map(
    tickets.map((t) => [
      t.id,
      {
        id: t.id,
        title: t.title,
        sprintId: t.sprintId,
        sprintName: t.sprint?.name ?? null,
        sprintStartDate: t.sprint?.startDate ?? null,
      },
    ])
  );

  const sequencingWarnings = detectSequencingWarnings(
    allDependencies.map((d) => ({
      fromTicketId: d.fromTicketId,
      toTicketId: d.toTicketId,
      type: d.type,
    })),
    ticketMap
  );

  return NextResponse.json({
    data: { tickets, dependencies: allDependencies, sequencingWarnings },
  });
}
