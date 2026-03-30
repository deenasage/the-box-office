// SPEC: ai-estimation.md
import claude from "./claude-client";
import { Team, TicketSize } from "@prisma/client";
import type { HistoricalTicket } from "./estimation-context";

export type FlagType =
  | "AMBIGUOUS_SCOPE"
  | "LIKELY_UNDERESTIMATED"
  | "NO_SIMILAR_TICKETS"
  | "MISSING_DESCRIPTION";

export interface EstimationFlag {
  type: FlagType;
  message: string;
}

export interface AIEstimateOutput {
  suggestedSize: TicketSize;
  confidence: number;
  rationale: string;
  flags: EstimationFlag[];
  promptTokens: number;
  outputTokens: number;
}

const SYSTEM_PROMPT = `You are a story point estimation assistant for a marketing operations team.
You estimate effort for tickets using historical data and team-specific context.
You always respond with valid JSON. Never include commentary outside the JSON object.`;

const VALID_SIZES = new Set<string>(Object.values(TicketSize));

function buildPrompt(
  ticket: { title: string; description: string | null; team: Team },
  similar: HistoricalTicket[]
): string {
  const refs =
    similar.length > 0
      ? similar
          .map(
            (t) =>
              `- [${t.size}] ${t.title}: ${t.description?.slice(0, 200) ?? "(no desc)"}`
          )
          .join("\n")
      : "(no historical reference tickets available)";

  return `Estimate the effort for the following ticket.

TICKET TO ESTIMATE:
Team: ${ticket.team}
Title: ${ticket.title}
Description: ${ticket.description ?? "(none provided)"}

HISTORICAL REFERENCE TICKETS (same team, completed):
${refs}

STORY POINT SCALE:
XS=1pt (< 2 hours), S=2pt (half day), M=3pt (1 day), L=5pt (2–3 days),
XL=8pt (4–5 days), XXL=13pt (1–2 weeks)

OUTPUT FORMAT (respond ONLY with this JSON, no markdown):
{
  "suggestedSize": "XS"|"S"|"M"|"L"|"XL"|"XXL",
  "confidence": 0.0 to 1.0,
  "rationale": "string — 1–2 sentences explaining the estimate",
  "flags": [
    { "type": "AMBIGUOUS_SCOPE"|"LIKELY_UNDERESTIMATED"|"NO_SIMILAR_TICKETS"|"MISSING_DESCRIPTION", "message": "string" }
  ]
}

Rules:
- confidence above 0.8 means you are highly certain; below 0.4 means significant uncertainty.
- Always include NO_SIMILAR_TICKETS flag if fewer than 3 reference tickets were provided.
- Always include MISSING_DESCRIPTION flag if the ticket has no description.
- Include AMBIGUOUS_SCOPE if the title or description contains phrases like "etc.", "and more", "TBD", "various", or is fewer than 10 words total.
- Include LIKELY_UNDERESTIMATED if the described scope appears larger than a typical XS or S ticket but the historical reference suggests a small estimate.`;
}

export async function estimateTicket(
  ticket: { title: string; description: string | null; team: Team },
  similar: HistoricalTicket[]
): Promise<AIEstimateOutput> {
  const message = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(ticket, similar) }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";

  let parsed: {
    suggestedSize?: string;
    confidence?: number;
    rationale?: string;
    flags?: EstimationFlag[];
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Claude returned invalid JSON: " + raw.slice(0, 200));
  }

  // Validate + sanitise
  const suggestedSize = parsed.suggestedSize && VALID_SIZES.has(parsed.suggestedSize)
    ? (parsed.suggestedSize as TicketSize)
    : TicketSize.M; // fallback to M if invalid

  let confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
  confidence = Math.max(0, Math.min(1, confidence)); // clamp to [0,1]

  const flags: EstimationFlag[] = Array.isArray(parsed.flags) ? parsed.flags : [];

  return {
    suggestedSize,
    confidence,
    rationale: parsed.rationale ?? "No rationale provided.",
    flags,
    promptTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
