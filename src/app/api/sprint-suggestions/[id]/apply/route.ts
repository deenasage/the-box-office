// SPEC: capacity-ai.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole , Prisma } from "@prisma/client";
import { z } from "zod";

const bodySchema = z.object({
  sprintId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { role } = session.user;
  if (role !== UserRole.ADMIN && role !== UserRole.TEAM_LEAD) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const suggestion = await db.sprintSuggestion.findUnique({ where: { id } });
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sprintId } = parsed.data;

  // Verify sprint exists
  const sprint = await db.sprint.findUnique({ where: { id: sprintId }, select: { id: true } });
  if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

  const ticketIds: string[] = JSON.parse(suggestion.ticketIds);

  // Verify all ticket IDs exist before applying
  const found = await db.ticket.findMany({
    where: { id: { in: ticketIds } },
    select: { id: true },
  });
  if (found.length !== ticketIds.length) {
    const foundIds = new Set(found.map((t) => t.id));
    const missingIds = ticketIds.filter((tid) => !foundIds.has(tid));
    return NextResponse.json(
      { error: `Tickets not found: ${missingIds.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    await db.$transaction(
      ticketIds.map((ticketId) =>
        db.ticket.update({ where: { id: ticketId }, data: { sprintId } })
      )
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "One or more tickets not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to apply suggestion" }, { status: 500 });
  }

  return NextResponse.json({ applied: true, sprintId, ticketIds });
}
