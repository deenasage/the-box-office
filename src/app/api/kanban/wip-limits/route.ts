// SPEC: tickets.md
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Team, TicketStatus } from "@prisma/client";

// Default WIP limits that match the hardcoded COLUMNS values in types.ts.
// These are applied to all teams as the initial global baseline.
const DEFAULTS: { status: TicketStatus; wipLimit: number | null }[] = [
  { status: TicketStatus.BACKLOG,     wipLimit: null },
  { status: TicketStatus.TODO,        wipLimit: null },
  { status: TicketStatus.IN_PROGRESS, wipLimit: 5 },
  { status: TicketStatus.IN_REVIEW,   wipLimit: 3 },
  { status: TicketStatus.BLOCKED,     wipLimit: null },
  { status: TicketStatus.DONE,        wipLimit: null },
];

const ALL_TEAMS = Object.values(Team);

// GET /api/kanban/wip-limits
// Returns { status: string; wipLimit: number | null }[] — one entry per status.
// "wipLimit" is the most restrictive (minimum) limit across all teams, or null if none set.
// Seeds default rows for all teams if they do not already exist.
export async function GET() {
  // Seed defaults for every team × status combination that has no row yet.
  // update: {} ensures we never overwrite admin-configured values.
  for (const d of DEFAULTS) {
    for (const team of ALL_TEAMS) {
      await db.kanbanColumnConfig.upsert({
        where: { team_status: { team, status: d.status } },
        create: { team, status: d.status, wipLimit: d.wipLimit },
        update: {},
      });
    }
  }

  const rows = await db.kanbanColumnConfig.findMany();

  // Aggregate to per-status global limits: take the minimum non-null wipLimit
  // across all teams. If all teams have null for a status, return null.
  const limitByStatus: Record<string, number | null> = {};
  for (const row of rows) {
    const key = row.status as string;
    if (!(key in limitByStatus)) {
      limitByStatus[key] = row.wipLimit;
    } else {
      const current = limitByStatus[key];
      if (row.wipLimit === null) {
        // null means no limit — no effect on the aggregate minimum
      } else if (current === null) {
        limitByStatus[key] = row.wipLimit;
      } else {
        limitByStatus[key] = Math.min(current, row.wipLimit);
      }
    }
  }

  const result = DEFAULTS.map((d) => ({
    status: d.status as string,
    wipLimit: d.status in limitByStatus ? limitByStatus[d.status] : d.wipLimit,
  }));

  return NextResponse.json(result);
}
