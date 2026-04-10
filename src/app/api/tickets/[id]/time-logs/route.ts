// SPEC: tickets.md
// GET  /api/tickets/[id]/time-logs — Auth: any authenticated. Returns { data: TimeLog[] } ordered by loggedAt desc, includes user.name.
// POST /api/tickets/[id]/time-logs — Auth: any authenticated. Body: { hours: number, note?: string }. Creates log for session user. Returns { data: TimeLog } 201.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const createTimeLogSchema = z.object({
  hours: z
    .number()
    .min(0.25, "Minimum 0.25 hours (15 minutes)")
    .max(24, "Maximum 24 hours per entry"),
  note: z.string().max(1000).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true } });
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const timeLogs = await db.timeLog.findMany({
      where: { ticketId: id },
      orderBy: { loggedAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: timeLogs });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createTimeLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const timeLog = await db.timeLog.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        hours: parsed.data.hours,
        note: parsed.data.note,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ data: timeLog }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
