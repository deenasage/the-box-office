// SPEC: ai-brief.md
import claude from "./claude-client";
import { v4 as uuidv4 } from "uuid";

export interface ClarificationItem {
  id: string;
  question: string;
  answer: string | null;
  answered: boolean;
}

export interface BriefOutput {
  objective: string | null;
  targetAudience: string | null;
  deliverables: string[];
  dependencies: string[];
  requiredTeams: string[];
  timeline: string | null;
  successMetrics: string[];
  clarifications: ClarificationItem[];
  promptTokens: number;
  outputTokens: number;
}

interface BriefPromptInput {
  rawTextFields: string;
  extractedText: string;
  previousClarifications?: ClarificationItem[]; // for refine calls
}

const SYSTEM_PROMPT = `You are a project intake specialist for a marketing operations team.
You analyze work requests and produce structured project briefs.
You always respond with valid JSON matching the BriefOutput schema.
Never include commentary outside the JSON object.`;

function buildUserPrompt(input: BriefPromptInput): string {
  const clarificationContext =
    input.previousClarifications && input.previousClarifications.length > 0
      ? `\n\nCLARIFICATION ANSWERS FROM USER:\n${input.previousClarifications
          .filter((c) => c.answered)
          .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
          .join("\n\n")}`
      : "";

  return `Analyze the following work request and produce a project brief.

INPUT TEXT:
${input.rawTextFields}

UPLOADED DOCUMENT CONTENT:
${input.extractedText || "(no documents uploaded)"}${clarificationContext}

OUTPUT FORMAT (respond ONLY with this JSON, no markdown):
{
  "objective": "string or null",
  "targetAudience": "string or null",
  "deliverables": ["string"],
  "dependencies": ["string"],
  "requiredTeams": ["CONTENT"|"DESIGN"|"SEO"|"WEM"|"PAID_MEDIA"|"ANALYTICS"],
  "timeline": "string or null",
  "successMetrics": ["string"],
  "clarifications": [
    { "id": "uuid", "question": "string", "answer": null, "answered": false }
  ]
}

Rules:
- requiredTeams must only contain values from: CONTENT, DESIGN, SEO, WEM, PAID_MEDIA, ANALYTICS.
- clarifications must list EVERY piece of information that is ambiguous or missing and would change scope or team assignment if answered.
- If information is not present, use null for that field — do not invent facts.
- timeline should be a plain English estimate (e.g., "3–4 weeks starting early April").
- Each clarification id must be a valid UUID v4.`;
}

export async function generateBrief(input: BriefPromptInput): Promise<BriefOutput> {
  const message = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(input),
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: Omit<BriefOutput, "promptTokens" | "outputTokens">;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Claude returned invalid JSON: " + raw.slice(0, 200));
  }

  // Ensure clarification items have valid UUIDs (Claude sometimes generates non-UUIDs)
  const clarifications: ClarificationItem[] = (parsed.clarifications ?? []).map((c) => ({
    id: c.id && /^[0-9a-f-]{36}$/.test(c.id) ? c.id : uuidv4(),
    question: c.question,
    answer: c.answer ?? null,
    answered: c.answered ?? false,
  }));

  return {
    objective: parsed.objective ?? null,
    targetAudience: parsed.targetAudience ?? null,
    deliverables: Array.isArray(parsed.deliverables) ? parsed.deliverables : [],
    dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
    requiredTeams: Array.isArray(parsed.requiredTeams) ? parsed.requiredTeams : [],
    timeline: parsed.timeline ?? null,
    successMetrics: Array.isArray(parsed.successMetrics) ? parsed.successMetrics : [],
    clarifications,
    promptTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
