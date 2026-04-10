// SPEC: brief-to-epic-workflow.md
// Phase 4 — Gantt chart items for an epic
// GET  /api/epics/[id]/gantt — list GanttItems for an epic, sorted by order ASC; auth required
// POST /api/epics/[id]/gantt — create a GanttItem manually; ADMIN or TEAM_LEAD only
// Response: { data: GanttItem[] } | { data: GanttItem } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { Team, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEAM_COLORS: Record<Team, string> = {
  CONTENT: "#3b82f6",
  DESIGN: "#8b5cf6",
  SEO: "#22c55e",
  WEM: "#f97316",
  PAID_MEDIA: "#ec4899",
  ANALYTICS: "#14b8a6",
};

function defaultColor(team: Team | null | undefined): string | null {
  if (!team) return null;
  return TEAM_COLORS[team] ?? null;
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const CreateGanttItemSchema = z.object({
  title: z.string().min(1).max(255),
  team: z.nativeEnum(Team).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, "color must be a hex string")
    .nullable()
    .optional(),
  startDate: z.string().datetime({ message: "startDate must be an ISO datetime string" }),
  endDate: z.string().datetime({ message: "endDate must be an ISO datetime string" }),
  order: z.number().int().optional(),
});

// ── GET /api/epics/[id]/gantt ─────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  void session; // auth confirmed; role not restricted for reads

  const { id } = await params;

  const epic = await db.epic.findUnique({ where: { id }, select: { id: true } });
  if (!epic) return NextResponse.json({ error: "Epic not found" }, { status: 404 });

  const items = await db.ganttItem.findMany({
    where: { epicId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ data: items });
}

// ── POST /api/epics/[id]/gantt ────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (
    !isPrivileged(session.user.role as UserRole)
  ) {
    return NextResponse.json(
      { error: "Forbidden — admin or team lead required" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const epic = await db.epic.findUnique({ where: { id }, select: { id: true } });
  if (!epic) return NextResponse.json({ error: "Epic not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateGanttItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, team, color, startDate, endDate, order } = parsed.data;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    return NextResponse.json(
      { error: "startDate must be before endDate" },
      { status: 400 }
    );
  }

  const resolvedColor = color !== undefined ? color : defaultColor(team ?? null);

  let item;
  try {
    item = await db.ganttItem.create({
      data: {
        epicId: id,
        title,
        team: team ?? null,
        color: resolvedColor,
        startDate: start,
        endDate: end,
        order: order ?? 0,
        aiGenerated: false,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to create Gantt item" }, { status: 500 });
  }

  return NextResponse.json({ data: item }, { status: 201 });
}
