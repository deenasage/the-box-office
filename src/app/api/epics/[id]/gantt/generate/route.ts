// SPEC: brief-to-epic-workflow.md
// Phase 4 — AI-generate GanttItems from an epic's tickets and linked brief
// POST /api/epics/[id]/gantt/generate — ADMIN or TEAM_LEAD only
// Steps: fetch epic + tickets + brief → delete existing AI items → call Claude → insert new items
// Response: { data: GanttItem[] } 201 | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { Team, UserRole } from "@prisma/client";
import claude from "@/lib/ai/claude-client";

export const dynamic = "force-dynamic";

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAM_COLORS: Record<Team, string> = {
  CONTENT: "#3b82f6",
  DESIGN: "#8b5cf6",
  SEO: "#22c55e",
  WEM: "#f97316",
  PAID_MEDIA: "#ec4899",
  ANALYTICS: "#14b8a6",
};

const VALID_TEAMS = new Set<string>(Object.values(Team));

function toTeamOrNull(value: unknown): Team | null {
  if (typeof value === "string" && VALID_TEAMS.has(value)) {
    return value as Team;
  }
  return null;
}

function defaultColor(team: Team | null): string | null {
  if (!team) return null;
  return TEAM_COLORS[team] ?? null;
}

/** Returns a date string for today (local calendar, ISO format). */
function today(): string {
  return new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
}

/** Returns a date string 12 weeks from today (ISO). */
function twelveWeeksFromNow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 84); // 12 × 7
  return d.toISOString().split("T")[0] + "T00:00:00.000Z";
}

// ── Claude response item type (internal) ──────────────────────────────────────

interface RawGanttItem {
  title: unknown;
  team?: unknown;
  color?: unknown;
  startDate: unknown;
  endDate: unknown;
  order?: unknown;
}

// ── POST /api/epics/[id]/gantt/generate ───────────────────────────────────────

export async function POST(
  _req: NextRequest,
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

  // ── 1. Fetch epic with tickets and linked brief ───────────────────────────

  const epic = await db.epic.findUnique({
    where: { id },
    include: {
      tickets: {
        select: {
          id: true,
          title: true,
          team: true,
          size: true,
          status: true,
        },
      },
      briefs: {
        select: {
          title: true,
          objective: true,
          timeline: true,
          deliverables: true,
        },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!epic) {
    return NextResponse.json({ error: "Epic not found" }, { status: 404 });
  }

  // ── 2. Resolve date bounds ────────────────────────────────────────────────

  const epicStart = epic.startDate
    ? epic.startDate.toISOString()
    : today();

  const epicEnd = epic.endDate
    ? epic.endDate.toISOString()
    : twelveWeeksFromNow();

  // ── 3. Delete existing AI-generated items before regenerating ─────────────

  await db.ganttItem.deleteMany({
    where: { epicId: id, aiGenerated: true },
  });

  // ── 4. Build the Claude prompt ────────────────────────────────────────────

  const brief = epic.briefs[0] ?? null;

  const ticketList = epic.tickets.map((t) => ({
    title: t.title,
    team: t.team,
    size: t.size ?? "unestimated",
    status: t.status,
  }));

  const briefContext = brief
    ? [
        brief.objective ? `Objective: ${brief.objective}` : "",
        brief.timeline ? `Timeline: ${brief.timeline}` : "",
        brief.deliverables
          ? `Deliverables: ${JSON.parse(brief.deliverables as string).join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "No brief attached.";

  const systemPrompt =
    "You are a project planner. Return ONLY valid JSON, no markdown.";

  const userPrompt = `
Epic: ${epic.name}
Epic runs from ${epicStart} to ${epicEnd}.

Brief context:
${briefContext}

Tickets (${ticketList.length} total):
${JSON.stringify(ticketList, null, 2)}

Generate a realistic Gantt schedule for these tickets.
Rules:
- Respect weekdays only (Mon–Fri) — do not schedule work on weekends.
- Keep all dates within the epic range (${epicStart} to ${epicEnd}).
- Sequence work logically across the available time.
- Group work by team where possible to avoid constant context-switching.
- Assign a distinct color per team using these values: CONTENT=#3b82f6, DESIGN=#8b5cf6, SEO=#22c55e, WEM=#f97316, PAID_MEDIA=#ec4899, ANALYTICS=#14b8a6.
- If a ticket has no team, leave team and color null.

Return JSON in this exact shape — no other text:
{
  "items": [
    {
      "title": "string",
      "team": "CONTENT | DESIGN | SEO | WEM | PAID_MEDIA | ANALYTICS | null",
      "color": "#hexcolor or null",
      "startDate": "ISO 8601 datetime string",
      "endDate": "ISO 8601 datetime string",
      "order": 0
    }
  ]
}
`.trim();

  // ── 5. Call Claude ────────────────────────────────────────────────────────

  let rawContent: string;
  try {
    const message = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const firstBlock = message.content[0];
    if (!firstBlock || firstBlock.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format from AI" },
        { status: 500 }
      );
    }
    rawContent = firstBlock.text;
  } catch {
    return NextResponse.json(
      { error: "AI generation failed — check ANTHROPIC_API_KEY and connectivity" },
      { status: 500 }
    );
  }

  // ── 6. Parse and validate the JSON response ───────────────────────────────

  let parsed: { items: RawGanttItem[] };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return NextResponse.json(
      { error: "AI returned invalid JSON — cannot parse Gantt schedule" },
      { status: 500 }
    );
  }

  if (!Array.isArray(parsed?.items)) {
    return NextResponse.json(
      { error: "AI response missing expected 'items' array" },
      { status: 500 }
    );
  }

  // ── 7. Insert all items in a transaction ─────────────────────────────────

  let insertedItems;
  try {
    insertedItems = await db.$transaction(async (tx) => {
      const created = [];
      for (let i = 0; i < parsed.items.length; i++) {
        const raw = parsed.items[i];

        const title = typeof raw.title === "string" && raw.title.trim()
          ? raw.title.trim()
          : `Task ${i + 1}`;

        const team = toTeamOrNull(raw.team);

        // Prefer Claude-provided color; fall back to team default; accept null
        let color: string | null = null;
        if (
          typeof raw.color === "string" &&
          /^#[0-9a-fA-F]{3,8}$/.test(raw.color)
        ) {
          color = raw.color;
        } else {
          color = defaultColor(team);
        }

        // Validate dates — skip items with unparseable dates rather than 500-ing
        const startDate =
          typeof raw.startDate === "string" ? new Date(raw.startDate) : null;
        const endDate =
          typeof raw.endDate === "string" ? new Date(raw.endDate) : null;

        if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          continue; // skip malformed items
        }

        // Enforce startDate < endDate
        const resolvedEnd = endDate <= startDate
          ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000) // +1 day
          : endDate;

        const order = typeof raw.order === "number" ? Math.round(raw.order) : i;

        const item = await tx.ganttItem.create({
          data: {
            epicId: id,
            title,
            team,
            color,
            startDate,
            endDate: resolvedEnd,
            order,
            aiGenerated: true,
          },
        });
        created.push(item);
      }
      return created;
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save generated Gantt items" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: insertedItems }, { status: 201 });
}
