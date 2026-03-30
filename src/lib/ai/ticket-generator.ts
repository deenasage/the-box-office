// SPEC: smart-tickets.md
import claude from "./claude-client";
import { Team, TicketSize } from "@prisma/client";

const VALID_TEAMS = new Set<string>(Object.values(Team));

export interface GeneratedTicketDraft {
  team: Team;
  title: string;
  description: string;
  suggestedSize: TicketSize | null;
}

interface BriefInput {
  title: string;
  objective: string | null;
  targetAudience: string | null;
  deliverables: string[];
  dependencies: string[];
  requiredTeams: string[];
  timeline: string | null;
  successMetrics: string[];
}

const SYSTEM_PROMPT = `You are a project management assistant for a marketing operations team.
You create work tickets for specific teams from a finalized project brief.
You always respond with valid JSON. Never include commentary outside the JSON object.`;

function buildPrompt(brief: BriefInput): string {
  return `A project brief has been finalized. Generate one work ticket for each team that is required for this project. Use only the teams listed in requiredTeams.

BRIEF:
Title: ${brief.title}
Objective: ${brief.objective ?? "Not specified"}
Target Audience: ${brief.targetAudience ?? "Not specified"}
Deliverables: ${brief.deliverables.join(", ") || "Not specified"}
Dependencies: ${brief.dependencies.join(", ") || "None"}
Required Teams: ${brief.requiredTeams.join(", ")}
Timeline: ${brief.timeline ?? "Not specified"}
Success Metrics: ${brief.successMetrics.join(", ") || "Not specified"}

OUTPUT FORMAT (respond ONLY with this JSON array, no markdown):
[
  {
    "team": "CONTENT"|"DESIGN"|"SEO"|"WEM"|"PAID_MEDIA"|"ANALYTICS",
    "title": "string — concise ticket title specific to this team's work",
    "description": "string — 2–4 sentences scoped to this team's deliverables only",
    "suggestedSize": "XS"|"S"|"M"|"L"|"XL"|"XXL"|null
  }
]

Rules:
- Only generate tickets for teams listed in requiredTeams.
- Each ticket title must name the team's specific deliverable, not the overall project.
- description must reference the brief objective but focus only on what THIS team does.
- suggestedSize should reflect effort for THIS team only. XS=1pt, S=2pt, M=3pt, L=5pt, XL=8pt, XXL=13pt.
- Use null for suggestedSize if you cannot determine effort from the available information.
- Do not generate duplicate teams. One ticket per team maximum.`;
}

export async function generateTicketsFromBrief(brief: BriefInput): Promise<{
  tickets: GeneratedTicketDraft[];
  promptTokens: number;
  outputTokens: number;
}> {
  const message = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(brief) }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "[]";

  let parsed: { team: string; title: string; description: string; suggestedSize: string | null }[];
  try {
    parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
  } catch {
    throw new Error("Claude returned invalid JSON: " + raw.slice(0, 200));
  }

  const seen = new Set<string>();
  const tickets: GeneratedTicketDraft[] = [];

  for (const item of parsed) {
    if (!VALID_TEAMS.has(item.team)) continue; // skip invalid teams
    if (seen.has(item.team)) continue;         // skip duplicates
    seen.add(item.team);

    const size = item.suggestedSize && Object.values(TicketSize).includes(item.suggestedSize as TicketSize)
      ? (item.suggestedSize as TicketSize)
      : null;

    tickets.push({
      team: item.team as Team,
      title: item.title,
      description: item.description,
      suggestedSize: size,
    });
  }

  return {
    tickets,
    promptTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
