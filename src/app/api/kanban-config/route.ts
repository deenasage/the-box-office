// SPEC: tickets.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team, TicketStatus, UserRole } from "@prisma/client";

// GET /api/kanban-config — returns all KanbanColumnConfig rows
export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const configs = await db.kanbanColumnConfig.findMany({
    orderBy: [{ team: "asc" }, { status: "asc" }],
  });

  return NextResponse.json(configs);
}

const upsertSchema = z.object({
  team: z.nativeEnum(Team),
  status: z.nativeEnum(TicketStatus),
  wipLimit: z.number().int().positive().nullable(),
});

// POST /api/kanban-config — upsert a single team+status entry (ADMIN or TEAM_LEAD only)
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    session.user.role !== UserRole.ADMIN &&
    session.user.role !== UserRole.TEAM_LEAD
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { team, status, wipLimit } = parsed.data;

  const config = await db.kanbanColumnConfig.upsert({
    where: { team_status: { team, status } },
    update: { wipLimit },
    create: { team, status, wipLimit },
  });

  return NextResponse.json(config);
}
