// SPEC: dependencies.md
import claude from "./claude-client";

export interface AIDetectedDependency {
  fromTicketId: string;
  toTicketId: string;
  type: "BLOCKS" | "RELATED";
  confidence: number;
  rationale: string;
}

const SYSTEM_PROMPT = `You are a project management assistant analyzing work tickets for cross-team dependencies.
A dependency exists when one team's ticket must be completed before another team can start their work.
You always respond with valid JSON. Never include commentary outside the JSON object.`;

function buildPrompt(
  tickets: { id: string; team: string; title: string; description: string | null }[]
): string {
  const ticketList = tickets
    .map(
      (t) =>
        `ID: ${t.id}\nTeam: ${t.team}\nTitle: ${t.title}\nDescription: ${t.description ?? "(none)"}`
    )
    .join("\n\n");

  return `Analyze the following tickets and identify likely dependencies between them.

TICKETS:
${ticketList}

OUTPUT FORMAT (respond ONLY with this JSON array, no markdown):
[
  {
    "fromTicketId": "string — the ticket that BLOCKS or is RELATED",
    "toTicketId": "string — the ticket that is blocked or related",
    "type": "BLOCKS"|"RELATED",
    "confidence": 0.0 to 1.0,
    "rationale": "string — 1 sentence explaining why this dependency exists"
  }
]

Rules:
- Only use ticket IDs from the provided list. Do not invent IDs.
- Only output BLOCKS when there is a clear sequential dependency (team A must finish before team B can start).
- Use RELATED for informational links where the work is connected but not strictly sequential.
- Do not output BLOCKED_BY — model all blocking relationships as BLOCKS from the blocker's perspective.
- Minimum confidence threshold to include a dependency: 0.5.
- If no dependencies exist, return an empty array [].
- Typical BLOCKS pattern: DESIGN blocks CONTENT (design assets needed before copywriting),
  WEM blocks CONTENT (CMS page needed before content can be published),
  SEO blocks CONTENT (keyword research needed before writing).`;
}

export async function detectDependencies(
  tickets: { id: string; team: string; title: string; description: string | null }[]
): Promise<AIDetectedDependency[]> {
  const message = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(tickets) }],
  });

  const raw =
    message.content[0].type === "text" ? message.content[0].text : "[]";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("Claude dependency-detector returned invalid JSON:", raw.slice(0, 300));
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.error("Claude dependency-detector returned non-array:", raw.slice(0, 300));
    return [];
  }

  const validIds = new Set(tickets.map((t) => t.id));
  const validTypes = new Set<string>(["BLOCKS", "RELATED"]);

  const results: AIDetectedDependency[] = [];

  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;

    const { fromTicketId, toTicketId, type, confidence, rationale } = item as Record<
      string,
      unknown
    >;

    // Validate ticket IDs are from the provided set
    if (typeof fromTicketId !== "string" || !validIds.has(fromTicketId)) {
      console.warn("Skipping dependency with unknown fromTicketId:", fromTicketId);
      continue;
    }
    if (typeof toTicketId !== "string" || !validIds.has(toTicketId)) {
      console.warn("Skipping dependency with unknown toTicketId:", toTicketId);
      continue;
    }

    // Reject BLOCKED_BY — Claude should not emit this, but guard anyway
    if (typeof type !== "string" || !validTypes.has(type)) {
      console.warn("Skipping dependency with invalid type:", type);
      continue;
    }

    // Validate confidence
    const confidenceNum =
      typeof confidence === "number"
        ? Math.max(0, Math.min(1, confidence))
        : 0;

    results.push({
      fromTicketId,
      toTicketId,
      type: type as "BLOCKS" | "RELATED",
      confidence: confidenceNum,
      rationale: typeof rationale === "string" ? rationale : "",
    });
  }

  return results;
}
