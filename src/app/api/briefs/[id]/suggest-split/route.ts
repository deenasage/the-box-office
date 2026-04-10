// SPEC: brief-to-epic-workflow.md
// Phase 3 — Ask Claude to propose how to split an approved brief into tickets across teams.
// POST /api/briefs/[id]/suggest-split
// Auth: ADMIN or TEAM_LEAD
// Brief must be in APPROVED status
// Does NOT write to DB — returns AI suggestion for PM review
// Response: { data: { epic, tickets } }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { BriefStatus, UserRole } from "@prisma/client";
import claude from "@/lib/ai/claude-client";

export const dynamic = "force-dynamic";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SuggestedEpic {
  title: string;
  description: string;
  estimatedStartDate: string;
  estimatedEndDate: string;
}

type TeamValue = "CONTENT" | "DESIGN" | "SEO" | "WEM";
type PriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface SuggestedTicket {
  tempId: string;
  title: string;
  description: string;
  team: TeamValue;
  storyPoints: number;
  priority: PriorityValue;
  dependsOn: string[];
}

interface SplitSuggestion {
  epic: SuggestedEpic;
  tickets: SuggestedTicket[];
}

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildSplitPrompt(brief: {
  title: string;
  objective: string | null;
  deliverables: string | null;
  dependencies: string | null;
  requiredTeams: string | null;
  timeline: string | null;
  successMetrics: string | null;
  clarifications: string | null;
  extractedText: string | null;
}): string {
  const deliverables = brief.deliverables ? JSON.parse(brief.deliverables) as string[] : [];
  const dependencies = brief.dependencies ? JSON.parse(brief.dependencies) as string[] : [];
  const requiredTeams = brief.requiredTeams ? JSON.parse(brief.requiredTeams) as string[] : [];
  const successMetrics = brief.successMetrics ? JSON.parse(brief.successMetrics) as string[] : [];
  const clarifications = brief.clarifications
    ? (JSON.parse(brief.clarifications) as Array<{ question: string; answer: string | null; answered: boolean }>)
        .filter((c) => c.answered && c.answer)
        .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
        .join("\n\n")
    : "";

  return `You are a senior project manager scoping a marketing project brief into actionable tickets.

BRIEF TITLE: ${brief.title}

OBJECTIVE:
${brief.objective ?? "(not specified)"}

DELIVERABLES:
${deliverables.length > 0 ? deliverables.map((d, i) => `${i + 1}. ${d}`).join("\n") : "(none listed)"}

REQUIRED TEAMS:
${requiredTeams.length > 0 ? requiredTeams.join(", ") : "(none specified)"}

DEPENDENCIES / CONSTRAINTS:
${dependencies.length > 0 ? dependencies.join("\n") : "(none listed)"}

SUCCESS METRICS:
${successMetrics.length > 0 ? successMetrics.map((m, i) => `${i + 1}. ${m}`).join("\n") : "(none listed)"}

TIMELINE:
${brief.timeline ?? "(not specified)"}

CLARIFICATIONS ANSWERED:
${clarifications || "(none)"}

UPLOADED DOCUMENT CONTENT:
${brief.extractedText ?? "(no documents)"}

Split this brief into the minimum set of tickets needed to deliver the work. Group by team (CONTENT, DESIGN, SEO, WEM). Identify dependencies between tickets. Estimate story points (1, 2, 3, 5, 8, 13). Return ONLY valid JSON.

OUTPUT FORMAT — respond with this exact JSON shape, no markdown, no commentary:
{
  "epic": {
    "title": "string — concise epic name derived from brief title",
    "description": "string — 1–3 sentences summarising the scope of work",
    "estimatedStartDate": "YYYY-MM-DD — earliest reasonable start given today's date",
    "estimatedEndDate": "YYYY-MM-DD — estimated delivery date based on timeline field"
  },
  "tickets": [
    {
      "tempId": "t1",
      "title": "string — concise action-oriented ticket title",
      "description": "string — what this team needs to do",
      "team": "CONTENT" | "DESIGN" | "SEO" | "WEM",
      "storyPoints": 1 | 2 | 3 | 5 | 8 | 13,
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "dependsOn": ["t1", "t2"]
    }
  ]
}

Rules:
- Only use teams: CONTENT, DESIGN, SEO, WEM.
- tempId values must be unique strings like "t1", "t2", "t3"…
- dependsOn lists the tempIds that must be completed before this ticket can start.
- storyPoints must be one of: 1, 2, 3, 5, 8, 13.
- priority must be one of: LOW, MEDIUM, HIGH, URGENT.
- estimatedStartDate and estimatedEndDate must be YYYY-MM-DD strings.
- Do not include any text outside the JSON object.`;
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const isAdminOrLead =
    session.user.role === UserRole.ADMIN ||
    isTeamLead(session.user.role as UserRole);

  if (!isAdminOrLead) {
    return NextResponse.json(
      { error: "Forbidden — admin or team lead required" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const brief = await db.brief.findUnique({ where: { id } });
  if (!brief) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  if (brief.status !== BriefStatus.APPROVED) {
    return NextResponse.json(
      { error: "Brief must be in APPROVED status to suggest a split" },
      { status: 400 }
    );
  }

  // Build and send the prompt
  let raw: string;
  let promptTokens: number;
  let outputTokens: number;

  try {
    const message = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system:
        "You are a project planning assistant. You only respond with valid JSON. Never include markdown code fences, commentary, or any text outside the JSON object.",
      messages: [
        {
          role: "user",
          content: buildSplitPrompt(brief),
        },
      ],
    });

    raw = message.content[0].type === "text" ? message.content[0].text : "";
    promptTokens = message.usage.input_tokens;
    outputTokens = message.usage.output_tokens;
  } catch (aiErr) {
    console.error("[suggest-split] Claude API error:", aiErr);
    return NextResponse.json(
      { error: "AI service unavailable — please try again" },
      { status: 502 }
    );
  }

  // Parse and validate Claude's response
  let parsed: SplitSuggestion;
  try {
    parsed = JSON.parse(raw) as SplitSuggestion;
  } catch {
    console.error("[suggest-split] Claude returned non-JSON:", raw.slice(0, 500));
    return NextResponse.json(
      { error: "AI returned an invalid response — please try again" },
      { status: 502 }
    );
  }

  // Structural validation
  if (!parsed.epic || typeof parsed.epic !== "object") {
    return NextResponse.json(
      { error: "AI response missing 'epic' field" },
      { status: 502 }
    );
  }
  if (!Array.isArray(parsed.tickets) || parsed.tickets.length === 0) {
    return NextResponse.json(
      { error: "AI response missing 'tickets' array or returned empty list" },
      { status: 502 }
    );
  }

  // Validate each ticket has required fields
  const validTeams = new Set<string>(["CONTENT", "DESIGN", "SEO", "WEM"]);
  const validPriorities = new Set<string>(["LOW", "MEDIUM", "HIGH", "URGENT"]);
  const validPoints = new Set<number>([1, 2, 3, 5, 8, 13]);

  for (const ticket of parsed.tickets) {
    if (!ticket.tempId || typeof ticket.tempId !== "string") {
      return NextResponse.json(
        { error: "AI returned a ticket without a valid tempId" },
        { status: 502 }
      );
    }
    if (!validTeams.has(ticket.team)) {
      return NextResponse.json(
        { error: `AI returned invalid team value: ${ticket.team}` },
        { status: 502 }
      );
    }
    if (!validPriorities.has(ticket.priority)) {
      return NextResponse.json(
        { error: `AI returned invalid priority value: ${ticket.priority}` },
        { status: 502 }
      );
    }
    if (!validPoints.has(ticket.storyPoints)) {
      // Clamp to nearest valid value rather than failing hard
      const sorted = [1, 2, 3, 5, 8, 13];
      ticket.storyPoints = sorted.reduce((prev, curr) =>
        Math.abs(curr - ticket.storyPoints) < Math.abs(prev - ticket.storyPoints)
          ? curr
          : prev
      );
    }
    if (!Array.isArray(ticket.dependsOn)) {
      ticket.dependsOn = [];
    }
  }

  // Log token usage — informational only, not persisted in this endpoint
  console.info(
    `[suggest-split] briefId=${id} promptTokens=${promptTokens} outputTokens=${outputTokens}`
  );

  return NextResponse.json({ data: parsed });
}
