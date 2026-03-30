// SPEC: project-document.md
// POST /api/portfolio/[epicId]/document/prefill — AI pre-fill using Claude.
// Fetches the epic (with GanttItems, Tickets, Brief) then calls Claude to generate
// pre-filled tab data. Updates the document with the generated data and sets
// aiPrefilled: true, aiPrefilledAt: now().
// Auth required.
// Response: { data: ProjectDocumentData } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import claude from "@/lib/ai/claude-client";
import type { ProjectDocumentData } from "@/types/project-document";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTab<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parseTabArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

type DbDoc = {
  id: string;
  epicId: string;
  overview: string | null;
  deliveryPlan: string | null;
  deliveryTimeline: string | null;
  raci: string | null;
  raid: string | null;
  gapsTracker: string | null;
  hypercare: string | null;
  riskRegister: string | null;
  issueLog: string | null;
  goLiveComms: string | null;
  aiPrefilled: boolean;
  aiPrefilledAt: Date | null;
  updatedAt: Date;
};

function formatDocument(doc: DbDoc): ProjectDocumentData {
  return {
    id: doc.id,
    epicId: doc.epicId,
    overview: parseTab(doc.overview),
    deliveryPlan: parseTabArray(doc.deliveryPlan),
    deliveryTimeline: parseTabArray(doc.deliveryTimeline),
    raci: parseTabArray(doc.raci),
    raid: parseTabArray(doc.raid),
    gapsTracker: parseTabArray(doc.gapsTracker),
    hypercare: parseTabArray(doc.hypercare),
    riskRegister: parseTabArray(doc.riskRegister),
    issueLog: parseTabArray(doc.issueLog),
    goLiveComms: parseTabArray(doc.goLiveComms),
    aiPrefilled: doc.aiPrefilled,
    aiPrefilledAt: doc.aiPrefilledAt ? doc.aiPrefilledAt.toISOString() : null,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ epicId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { epicId } = await params;

  // Fetch epic with all context Claude needs
  const epic = await db.epic.findUnique({
    where: { id: epicId },
    include: {
      ganttItems: true,
      tickets: { where: { status: "BLOCKED" } },
      briefs: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  if (!epic) return NextResponse.json({ error: "Epic not found" }, { status: 404 });

  // Build the most recent brief summary for the prompt
  const latestBrief = epic.briefs[0] ?? null;
  const briefSummary = latestBrief
    ? [
        latestBrief.objective ? `Objective: ${latestBrief.objective}` : null,
        latestBrief.deliverables
          ? `Deliverables: ${latestBrief.deliverables}`
          : null,
        latestBrief.timeline ? `Timeline: ${latestBrief.timeline}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : null;

  const ganttSummary = epic.ganttItems.map((g) => ({
    title: g.title,
    team: g.team ?? "Unknown",
    startDate: g.startDate.toISOString().slice(0, 10),
    endDate: g.endDate.toISOString().slice(0, 10),
  }));

  const blockedTickets = epic.tickets.map((t) => ({
    id: t.id,
    title: t.title,
    team: t.team,
  }));

  const today = new Date().toISOString().slice(0, 10);

  // Build the JSON schema description for Claude
  const schemaDescription = `
{
  "overview": {
    "projectName": "string — use epic name",
    "workfrontId": "string — leave empty if unknown",
    "startDate": "ISO date string YYYY-MM-DD or null",
    "deliveryDate": "ISO date string YYYY-MM-DD or null",
    "projectSummary": "string — use epic description",
    "agreedUponScope": "string — summarise from brief objective/deliverables if available",
    "expectedBenefits": "string — infer from brief if available",
    "links": []
  },
  "deliveryTimeline": [
    {
      "id": "unique 8-char alphanumeric string",
      "stage": "string — from gantt item title",
      "owner": "string — team name from gantt item",
      "ownerTeam": "one of CONTENT|DESIGN|SEO|WEM|PAID_MEDIA|ANALYTICS or null",
      "task": "string — gantt item title",
      "status": "Not Started",
      "notes": "",
      "weeklySlots": []
    }
  ],
  "raci": [
    {
      "id": "unique 8-char alphanumeric string",
      "workstream": "XD | Content | SEO | WEM | Primary Stakeholders | Senior Leadership",
      "responsible": "",
      "accountable": "",
      "consulted": "",
      "informed": ""
    }
  ],
  "raid": [
    {
      "id": 1,
      "type": "ISSUE",
      "description": "string — from blocked ticket title",
      "notes": "",
      "nextSteps": "",
      "owner": "string — team from blocked ticket",
      "updateDue": null,
      "dateLastUpdated": "${today}",
      "status": "OPEN"
    }
  ]
}`;

  const userPrompt = `
Epic name: ${epic.name}
Epic description: ${epic.description ?? "None"}
Epic start date: ${epic.startDate ? epic.startDate.toISOString().slice(0, 10) : "Not set"}
Epic end date: ${epic.endDate ? epic.endDate.toISOString().slice(0, 10) : "Not set"}

Brief summary:
${briefSummary ?? "No brief available"}

Gantt items (${ganttSummary.length}):
${JSON.stringify(ganttSummary, null, 2)}

Blocked tickets (${blockedTickets.length}):
${JSON.stringify(blockedTickets, null, 2)}

Generate a ProjectDocument prefill JSON object matching this schema exactly:
${schemaDescription}

Rules:
- deliveryTimeline: create one row per gantt item. If none, return an empty array.
- raci: include exactly these 6 workstreams: XD, Content, SEO, WEM, Primary Stakeholders, Senior Leadership.
- raid: one row per blocked ticket (type: "ISSUE"). If none, return an empty array. id fields are sequential integers starting at 1.
- overview: fill from epic data; leave unknown fields as empty strings or null.
- deliveryTimeline id fields: 8-char alphanumeric strings.
- raci id fields: 8-char alphanumeric strings.
`.trim();

  // Call Claude
  let prefillPayload: Record<string, unknown>;
  try {
    const message = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system:
        "Return only valid JSON matching the provided schema. No markdown, no explanation.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown fences
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    prefillPayload = JSON.parse(cleaned) as Record<string, unknown>;
  } catch (err) {
    console.error("[prefill] Claude call or JSON parse failed:", err);
    return apiError("AI prefill failed — could not generate or parse response", 502);
  }

  // Persist to database
  try {
    const updateData: Record<string, string | boolean | Date> = {
      aiPrefilled: true,
      aiPrefilledAt: new Date(),
    };

    if (prefillPayload.overview !== undefined) {
      updateData.overview = JSON.stringify(prefillPayload.overview);
    }
    if (prefillPayload.deliveryTimeline !== undefined) {
      updateData.deliveryTimeline = JSON.stringify(prefillPayload.deliveryTimeline);
    }
    if (prefillPayload.raci !== undefined) {
      updateData.raci = JSON.stringify(prefillPayload.raci);
    }
    if (prefillPayload.raid !== undefined) {
      updateData.raid = JSON.stringify(prefillPayload.raid);
    }

    const doc = await db.projectDocument.upsert({
      where: { epicId },
      create: { epicId, ...updateData },
      update: updateData,
    });

    return NextResponse.json({ data: formatDocument(doc) }, { status: 200 });
  } catch (err) {
    console.error("[prefill] DB upsert failed:", err);
    return apiError("Failed to save prefilled document", 500);
  }
}
