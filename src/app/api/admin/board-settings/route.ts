// SPEC: board-column-visibility.md
// GET   /api/admin/board-settings — ADMIN or TEAM_LEAD_CRAFT / TEAM_LEAD_STAKEHOLDER.
//         Returns all Team × TicketStatus configurations: { team, status, wipLimit, hidden }.
//         Upserts rows to ensure every combination exists before returning.
// PATCH /api/admin/board-settings — ADMIN or TEAM_LEAD_CRAFT / TEAM_LEAD_STAKEHOLDER.
//         Body: { team, status, wipLimit?, hidden? } — upserts a single config row.
// Response: { data: KanbanColumnConfig[] } | { data: KanbanColumnConfig } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePrivileged } from "@/lib/api-helpers";
import { Team, TicketStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALL_TEAMS = Object.values(Team);
const ALL_STATUSES = Object.values(TicketStatus);

const PatchBoardSettingsSchema = z.object({
  team: z.nativeEnum(Team),
  status: z.nativeEnum(TicketStatus),
  wipLimit: z.number().int().min(1).nullable().optional(),
  hidden: z.boolean().optional(),
});

// GET /api/admin/board-settings — ADMIN or TEAM_LEAD
export async function GET(_req: NextRequest) {
  const { error } = await requirePrivileged();
  if (error) return error;

  // Ensure every Team × TicketStatus combination has a row.
  // update: {} never overwrites admin-configured values.
  for (const team of ALL_TEAMS) {
    for (const status of ALL_STATUSES) {
      await db.kanbanColumnConfig.upsert({
        where: { team_status: { team, status } },
        create: { team, status, wipLimit: null, hidden: false },
        update: {},
      });
    }
  }

  const configs = await db.kanbanColumnConfig.findMany({
    orderBy: [{ team: "asc" }, { status: "asc" }],
    select: {
      id: true,
      team: true,
      status: true,
      wipLimit: true,
      hidden: true,
    },
  });

  return NextResponse.json({ data: configs });
}

// PATCH /api/admin/board-settings — ADMIN or TEAM_LEAD
export async function PATCH(req: NextRequest) {
  const { error } = await requirePrivileged();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchBoardSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { team, status, wipLimit, hidden } = parsed.data;

  // Build the update data object — only include fields that were explicitly provided
  const updateData: Prisma.KanbanColumnConfigUpdateInput = {};
  if (wipLimit !== undefined) updateData.wipLimit = wipLimit;
  if (hidden !== undefined) updateData.hidden = hidden;

  // If nothing to update, still upsert to ensure row exists
  const createData: Prisma.KanbanColumnConfigCreateInput = {
    team,
    status,
    wipLimit: wipLimit ?? null,
    hidden: hidden ?? false,
  };

  try {
    const config = await db.kanbanColumnConfig.upsert({
      where: { team_status: { team, status } },
      create: createData,
      update: updateData,
      select: {
        id: true,
        team: true,
        status: true,
        wipLimit: true,
        hidden: true,
      },
    });

    return NextResponse.json({ data: config });
  } catch (e) {
    console.error("[PATCH /api/admin/board-settings] error:", e);
    return NextResponse.json({ error: "Failed to update board settings" }, { status: 500 });
  }
}
