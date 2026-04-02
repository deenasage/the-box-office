// SPEC: ai-copilot.md
import claude from "./claude-client";
import type { CopilotContext } from "./copilot-context";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;
const MAX_HISTORY_MESSAGES = 10;

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(context: CopilotContext, trimmed: boolean): string {
  const today = new Date().toISOString().split("T")[0];
  const disclaimer = trimmed
    ? "\nNote: some historical brief data was excluded to stay within context limits."
    : "";

  return `You are an AI work management assistant for a marketing operations team.
You have access to the team's current tickets, sprints, capacity, and project briefs.
You help users understand the state of their work, identify risks, and generate reports.

IMPORTANT RULES:
- You are read-only. You do not create, update, or delete tickets, sprints, or briefs.
  If the user asks you to do this, explain that they must make those changes in the app.
- Always cite specific ticket titles, sprint names, or team names when you answer a question.
  Do not give vague answers.
- If you don't know the answer based on the provided context, say so clearly.
  Do not invent data.
- Format responses as readable markdown. Use:
  - ### for section headings (use sparingly, only for distinct sections)
  - **bold** only for critical numbers or key terms — not for every list item
  - Plain bullet points for lists — avoid bolding the entire bullet label
  - Blockquotes (> text) only for warnings or caveats, not for general info
  - Horizontal rules (---) only between major sections, not after every paragraph
- When listing at-risk or overdue tickets, always name them specifically with their status and assignee if known.
- Keep answers concise and conversational. Avoid excessive nesting or punctuation clutter.

CURRENT DATE: ${today}${disclaimer}

SYSTEM CONTEXT (current state of work):
${JSON.stringify(context, null, 2)}`;
}

// ── Streaming call ────────────────────────────────────────────────────────────

export async function streamCopilotResponse(
  messageHistory: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
  context: CopilotContext,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<{ promptTokens: number; outputTokens: number }> {
  // Detect if context was trimmed (heuristic: if briefs or recentlyClosed were dropped)
  const trimmed =
    context.recentBriefs.length < 10 || context.recentlyClosed.length < 2;

  const systemPrompt = buildSystemPrompt(context, trimmed);

  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...messageHistory.slice(-MAX_HISTORY_MESSAGES),
    { role: "user", content: userMessage },
  ];

  const stream = claude.messages.stream(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    },
    { signal }
  );

  stream.on("text", onChunk);

  const finalMessage = await stream.finalMessage();

  return {
    promptTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
  };
}
