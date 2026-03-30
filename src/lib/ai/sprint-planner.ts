// SPEC: capacity-ai.md
import claude from "./claude-client";
import { Team, TicketSize } from "@prisma/client";
import type { SprintCapacityContext, TeamScenarioBreakdown } from "./capacity-context";

export interface SprintScenario {
  sprintId: string;
  sprintName: string;
  feasibility: "FITS" | "TIGHT" | "OVERLOADED";
  teamBreakdowns: TeamScenarioBreakdown[];
  risks: string[];
}

export interface SprintRecommendation {
  sprintId: string;
  sprintName: string;
  rationale: string;
}

export interface SprintSuggestionOutput {
  scenarios: SprintScenario[];
  recommendation: SprintRecommendation | null;
  promptTokens: number;
  outputTokens: number;
}

const SYSTEM_PROMPT = `You are a sprint planning assistant for a marketing operations team.
You analyze team capacity and incoming work to recommend the best sprint placement.
You always respond with valid JSON. Never include commentary outside the JSON object.`;

function buildPrompt(
  tickets: { team: Team; size: TicketSize | null; title: string }[],
  context: SprintCapacityContext[]
): string {
  const ticketLines = tickets
    .map((t) => `  Team: ${t.team}, Size: ${t.size ?? "UNSIZED"}, Title: ${t.title}`)
    .join("\n");

  const sprintLines = context
    .map((s) => {
      const teamLines = s.teams
        .filter((t) => t.currentCapacityPoints > 0 || t.incomingPoints > 0)
        .map(
          (t) =>
            `    ${t.team}: capacity=${t.currentCapacityPoints}pts, committed=${t.currentCommittedPoints}pts, available=${t.availabilityPoints}pts` +
            (t.suggestedAssigneeName ? `, best-fit=${t.suggestedAssigneeName}` : "")
        )
        .join("\n");
      return `  Sprint: ${s.sprintName} (${s.startDate.slice(0, 10)} – ${s.endDate.slice(0, 10)}, id=${s.sprintId})\n${teamLines}`;
    })
    .join("\n\n");

  const hasUnsized = tickets.some((t) => !t.size);

  return `Recommend which sprint the following tickets should be placed in.

INCOMING TICKETS:
${ticketLines}

SPRINT CAPACITY (next ${context.length} sprints):
${sprintLines}

OUTPUT FORMAT (respond ONLY with this JSON, no markdown):
{
  "scenarios": [
    {
      "sprintId": "string",
      "sprintName": "string",
      "feasibility": "FITS"|"TIGHT"|"OVERLOADED",
      "teamBreakdowns": [
        {
          "team": "CONTENT"|"DESIGN"|"SEO"|"WEM"|"PAID_MEDIA"|"ANALYTICS",
          "currentCapacityPoints": number,
          "currentCommittedPoints": number,
          "incomingPoints": number,
          "projectedLoadPct": number,
          "loadStatus": "FITS"|"TIGHT"|"OVERLOADED",
          "suggestedAssignee": "userId or null",
          "suggestedAssigneeName": "name or null",
          "availabilityPoints": number
        }
      ],
      "risks": ["string"]
    }
  ],
  "recommendation": {
    "sprintId": "string",
    "sprintName": "string",
    "rationale": "string"
  }
}

Rules:
- FITS: projectedLoadPct <= 90%. TIGHT: 91–110%. OVERLOADED: > 110%.
- suggestedAssignee must be a userId from the capacity context, or null.
- risks must be concrete: name the team and the specific conflict.
- recommendation must identify the single best sprint across all scenarios.
- If all sprints are OVERLOADED: still pick the least-bad option and explain why.${
    hasUnsized ? "\n- UNSIZED tickets: treat as M (3 points). Note this in the risks array." : ""
  }`;
}

const VALID_TEAMS = new Set<string>(Object.values(Team));
const VALID_FEASIBILITY = new Set(["FITS", "TIGHT", "OVERLOADED"]);

export async function suggestSprintPlacement(
  tickets: { team: Team; size: TicketSize | null; title: string }[],
  capacityContext: SprintCapacityContext[]
): Promise<SprintSuggestionOutput> {
  const message = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(tickets, capacityContext) }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";

  let parsed: {
    scenarios?: unknown[];
    recommendation?: { sprintId: string; sprintName: string; rationale: string };
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Claude returned invalid JSON: " + raw.slice(0, 200));
  }

  // Build a set of valid sprint IDs from context for validation
  const validSprintIds = new Set(capacityContext.map((s) => s.sprintId));

  const scenarios: SprintScenario[] = [];
  if (Array.isArray(parsed.scenarios)) {
    for (const s of parsed.scenarios) {
      const scenario = s as Record<string, unknown>;
      if (
        typeof scenario.sprintId !== "string" ||
        !validSprintIds.has(scenario.sprintId)
      )
        continue;

      const teamBreakdowns: TeamScenarioBreakdown[] = [];
      if (Array.isArray(scenario.teamBreakdowns)) {
        for (const td of scenario.teamBreakdowns as Record<string, unknown>[]) {
          if (!VALID_TEAMS.has(td.team as string)) continue;
          teamBreakdowns.push({
            team: td.team as Team,
            currentCapacityPoints: Number(td.currentCapacityPoints) || 0,
            currentCommittedPoints: Number(td.currentCommittedPoints) || 0,
            incomingPoints: Number(td.incomingPoints) || 0,
            projectedLoadPct: Number(td.projectedLoadPct) || 0,
            loadStatus: VALID_FEASIBILITY.has(td.loadStatus as string)
              ? (td.loadStatus as "FITS" | "TIGHT" | "OVERLOADED")
              : "OVERLOADED",
            suggestedAssignee:
              typeof td.suggestedAssignee === "string" ? td.suggestedAssignee : null,
            suggestedAssigneeName:
              typeof td.suggestedAssigneeName === "string"
                ? td.suggestedAssigneeName
                : null,
            availabilityPoints: Number(td.availabilityPoints) || 0,
          });
        }
      }

      scenarios.push({
        sprintId: scenario.sprintId as string,
        sprintName: typeof scenario.sprintName === "string" ? scenario.sprintName : "",
        feasibility: VALID_FEASIBILITY.has(scenario.feasibility as string)
          ? (scenario.feasibility as "FITS" | "TIGHT" | "OVERLOADED")
          : "OVERLOADED",
        teamBreakdowns,
        risks: Array.isArray(scenario.risks)
          ? (scenario.risks as unknown[]).filter((r) => typeof r === "string") as string[]
          : [],
      });
    }
  }

  let recommendation: SprintRecommendation | null = null;
  if (
    parsed.recommendation &&
    typeof parsed.recommendation.sprintId === "string" &&
    validSprintIds.has(parsed.recommendation.sprintId)
  ) {
    recommendation = {
      sprintId: parsed.recommendation.sprintId,
      sprintName: parsed.recommendation.sprintName,
      rationale: parsed.recommendation.rationale,
    };
  }

  return {
    scenarios,
    recommendation,
    promptTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
