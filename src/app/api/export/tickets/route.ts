// SPEC: tickets.md
// GET /api/export/tickets — any authenticated user.
// Query params: team, sprintId, status (all optional).
// Returns a CSV file with columns:
//   ID,Title,Status,Team,Priority,Size,Assignee,Sprint,Created,Description

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team, TicketStatus } from "@prisma/client";
import { z } from "zod";

// ── CSV helpers ────────────────────────────────────────────────────────────────

/**
 * Escapes a single CSV field value.
 * Wraps in double-quotes if the value contains a comma, double-quote, or newline.
 * Internal double-quotes are escaped as "".
 */
function csvField(value: string | null | undefined): string {
  const s = value ?? "";
  // Must quote if it contains comma, double-quote, CR, or LF
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsvRow(fields: (string | null | undefined)[]): string {
  return fields.map(csvField).join(",");
}

// ── Priority label ─────────────────────────────────────────────────────────────

function priorityLabel(p: number): string {
  if (p === 4) return "Urgent";
  if (p === 3) return "High";
  if (p === 2) return "Med";
  if (p === 1) return "Low";
  return "None";
}

// ── Route handler ──────────────────────────────────────────────────────────────

const QuerySchema = z.object({
  team: z.nativeEnum(Team).optional(),
  sprintId: z.string().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
});

export async function GET(req: NextRequest) {
  // 1. Auth — any authenticated user
  const { session, error } = await requireAuth();
  if (error) return error;

  // Satisfy TS: session is used for guard purposes only here
  void session;

  // 2. Parse + validate query params
  const url = new URL(req.url);
  const rawParams = {
    team: url.searchParams.get("team") ?? undefined,
    sprintId: url.searchParams.get("sprintId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  };

  const parsed = QuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { team, sprintId, status } = parsed.data;

  // 3. Build where clause (mirrors tickets list page logic)
  const where = {
    ...(team ? { team } : {}),
    ...(status ? { status } : {}),
    ...(sprintId === "none" ? { sprintId: null } : sprintId ? { sprintId } : {}),
  };

  // 4. Fetch tickets — single query, no N+1
  let tickets: Array<{
    id: string;
    title: string;
    status: TicketStatus;
    team: Team;
    priority: number;
    size: string | null;
    assignee: { name: string } | null;
    sprint: { name: string } | null;
    labels: { label: { name: string } }[];
    createdAt: Date;
    description: string | null;
  }>;

  try {
    tickets = await db.ticket.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        team: true,
        priority: true,
        size: true,
        assignee: { select: { name: true } },
        sprint: { select: { name: true } },
        labels: { include: { label: { select: { name: true } } } },
        createdAt: true,
        description: true,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  } catch (dbErr) {
    console.error("[export/tickets] DB error:", dbErr);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }

  // 5. Build CSV
  const HEADER = "ID,Title,Status,Team,Priority,Size,Assignee,Sprint,Labels,Created,Description";

  const rows = tickets.map((t) =>
    buildCsvRow([
      t.id,
      t.title,
      t.status,
      t.team,
      priorityLabel(t.priority),
      t.size ?? "",
      t.assignee?.name ?? "",
      t.sprint?.name ?? "",
      t.labels.map((tl) => tl.label.name).join("; "),
      t.createdAt.toISOString(),
      t.description ?? "",
    ]),
  );

  const csv = [HEADER, ...rows].join("\r\n");

  // 6. Return as file download
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tickets-export.csv"',
      // Prevent caching of export files
      "Cache-Control": "no-store",
    },
  });
}
