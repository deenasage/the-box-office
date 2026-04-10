// SPEC: dependencies.md
// GET  /api/tickets/[id]/dependencies — Any authenticated — returns { dependenciesFrom, dependenciesTo, sequencingWarnings }
// POST /api/tickets/[id]/dependencies — ADMIN or TEAM_LEAD — create manual dependency
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { DependencyType, DetectionMethod, UserRole } from "@prisma/client";
import { detectSequencingWarnings } from "@/lib/dependencies";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  toTicketId: z.string().cuid(),
  type: z.nativeEnum(DependencyType),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Verify ticket exists
  const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deps = await db.ticketDependency.findMany({
    where: { OR: [{ fromTicketId: id }, { toTicketId: id }] },
    include: {
      fromTicket: {
        select: {
          id: true,
          title: true,
          team: true,
          status: true,
          sprintId: true,
          sprint: { select: { id: true, name: true, startDate: true } },
        },
      },
      toTicket: {
        select: {
          id: true,
          title: true,
          team: true,
          status: true,
          sprintId: true,
          sprint: { select: { id: true, name: true, startDate: true } },
        },
      },
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const dependenciesFrom = deps.filter((d) => d.fromTicketId === id);
  const dependenciesTo = deps.filter((d) => d.toTicketId === id);

  // Build ticket map for sequencing warning computation
  const ticketMap = new Map<
    string,
    { id: string; title: string; sprintId: string | null; sprintName: string | null; sprintStartDate: Date | null }
  >();
  for (const dep of deps) {
    const ft = dep.fromTicket;
    ticketMap.set(ft.id, {
      id: ft.id,
      title: ft.title,
      sprintId: ft.sprintId,
      sprintName: ft.sprint?.name ?? null,
      sprintStartDate: ft.sprint?.startDate ?? null,
    });
    const tt = dep.toTicket;
    ticketMap.set(tt.id, {
      id: tt.id,
      title: tt.title,
      sprintId: tt.sprintId,
      sprintName: tt.sprint?.name ?? null,
      sprintStartDate: tt.sprint?.startDate ?? null,
    });
  }

  const sequencingWarnings = detectSequencingWarnings(
    deps.map((d) => ({ fromTicketId: d.fromTicketId, toTicketId: d.toTicketId, type: d.type })),
    ticketMap
  );

  return NextResponse.json({ data: { dependenciesFrom, dependenciesTo, sequencingWarnings } });
}

export async function POST(
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

  // Verify the source ticket exists
  const fromTicket = await db.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!fromTicket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { toTicketId, type } = parsed.data;

  // Guard: no self-reference
  if (id === toTicketId) {
    return NextResponse.json(
      { error: "A ticket cannot depend on itself." },
      { status: 400 }
    );
  }

  // Verify target ticket exists
  const toTicket = await db.ticket.findUnique({ where: { id: toTicketId }, select: { id: true } });
  if (!toTicket) {
    return NextResponse.json({ error: "Target ticket not found." }, { status: 404 });
  }

  try {
    const dependency = await db.ticketDependency.create({
      data: {
        fromTicketId: id,
        toTicketId,
        type,
        detectedBy: DetectionMethod.MANUAL,
        createdBy: session.user.id,
      },
      include: {
        fromTicket: { select: { id: true, title: true, team: true, status: true } },
        toTicket: { select: { id: true, title: true, team: true, status: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json({ data: dependency }, { status: 201 });
  } catch (err: unknown) {
    // Prisma unique constraint violation — P2002
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "This dependency already exists." }, { status: 409 });
    }
    console.error("Failed to create dependency:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
