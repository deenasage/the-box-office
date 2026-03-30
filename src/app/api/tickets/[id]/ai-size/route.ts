// SPEC: brief-to-epic-workflow.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { storageReadAbsolute } from "@/lib/storage";
import { extractText } from "@/lib/ai/text-extractor";
import claude from "@/lib/ai/claude-client";
import { TicketSize } from "@prisma/client";

interface AISizeResponse {
  suggestedSize: TicketSize;
  confidence: number;
  rationale: string;
  flags: string[];
}

const SIZE_VALUES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

function isValidTicketSize(value: string): value is TicketSize {
  return (SIZE_VALUES as readonly string[]).includes(value);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      brief: {
        select: {
          id: true,
          objective: true,
          deliverables: true,
          timeline: true,
          requiredTeams: true,
          extractedText: true,
        },
      },
      attachments: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          storedPath: true,
        },
      },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Require a brief or at least one attachment to generate a useful estimate
  const hasBrief = ticket.brief !== null;
  const hasAttachments = ticket.attachments.length > 0;
  if (!hasBrief && !hasAttachments) {
    return NextResponse.json(
      { error: "Ticket must have a linked brief or attachments to use AI sizing." },
      { status: 400 }
    );
  }

  // Build context sections
  const sections: string[] = [];

  // Ticket core
  sections.push(`## Ticket\nTitle: ${ticket.title}\n${ticket.description ? `Description: ${ticket.description}` : ""}`);

  // Brief context
  if (ticket.brief) {
    const brief = ticket.brief;
    const briefParts: string[] = ["## Linked Brief"];
    if (brief.objective) briefParts.push(`Objective: ${brief.objective}`);
    if (brief.timeline) briefParts.push(`Timeline: ${brief.timeline}`);
    if (brief.requiredTeams) {
      try {
        const teams = JSON.parse(brief.requiredTeams) as string[];
        briefParts.push(`Required teams: ${teams.join(", ")}`);
      } catch {
        briefParts.push(`Required teams: ${brief.requiredTeams}`);
      }
    }
    if (brief.deliverables) {
      try {
        const deliverables = JSON.parse(brief.deliverables) as string[];
        briefParts.push(`Deliverables:\n${deliverables.map((d) => `- ${d}`).join("\n")}`);
      } catch {
        briefParts.push(`Deliverables: ${brief.deliverables}`);
      }
    }
    if (brief.extractedText) {
      const trimmed = brief.extractedText.slice(0, 3000);
      briefParts.push(`Extracted brief text (first 3000 chars):\n${trimmed}`);
    }
    sections.push(briefParts.join("\n"));
  }

  // Attachment text extraction
  if (ticket.attachments.length > 0) {
    const attachmentTexts: string[] = ["## Ticket Attachments"];
    for (const att of ticket.attachments) {
      try {
        const buffer = await storageReadAbsolute(att.storedPath);
        const { text } = await extractText(buffer, att.mimeType);
        if (text.trim()) {
          const trimmed = text.slice(0, 2000);
          attachmentTexts.push(`### ${att.fileName}\n${trimmed}`);
        }
      } catch {
        // Extraction failure is non-fatal — skip this attachment
      }
    }
    if (attachmentTexts.length > 1) {
      sections.push(attachmentTexts.join("\n\n"));
    }
  }

  const contextBlock = sections.join("\n\n");

  const prompt = `You are an expert agile project estimator. Based on the following ticket and context, estimate the effort size using this scale:

- XS = 2 hours
- S = 4 hours
- M = 8 hours (1 day)
- L = 20 hours (2.5 days)
- XL = 36 hours (4.5 days)
- XXL = 72 hours (~1.5 weeks)

${contextBlock}

Respond ONLY with valid JSON matching this exact shape — no markdown, no explanation outside the JSON:
{
  "suggestedSize": "XS" | "S" | "M" | "L" | "XL" | "XXL",
  "confidence": <number between 0.0 and 1.0>,
  "rationale": "<plain English explanation of the estimate>",
  "flags": ["<optional warning strings, e.g. ambiguous scope, missing details>"]
}`;

  let aiResponse: AISizeResponse;
  let promptTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    const message = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    promptTokens = message.usage.input_tokens;
    outputTokens = message.usage.output_tokens;

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(rawText) as Record<string, unknown>;

    const suggestedSize = parsed.suggestedSize;
    if (typeof suggestedSize !== "string" || !isValidTicketSize(suggestedSize)) {
      throw new Error("Invalid suggestedSize in AI response");
    }
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;
    const rationale =
      typeof parsed.rationale === "string" ? parsed.rationale : "";
    const flags = Array.isArray(parsed.flags)
      ? (parsed.flags as unknown[]).filter((f): f is string => typeof f === "string")
      : [];

    aiResponse = { suggestedSize, confidence, rationale, flags };
  } catch (e) {
    console.error("[POST /api/tickets/:id/ai-size] AI error:", e);
    return NextResponse.json(
      { error: "AI sizing failed. Please try again." },
      { status: 502 }
    );
  }

  const estimate = await db.aIEstimate.create({
    data: {
      ticketId: id,
      suggestedSize: aiResponse.suggestedSize,
      confidence: aiResponse.confidence,
      rationale: aiResponse.rationale,
      flags: JSON.stringify(aiResponse.flags),
      aiModel: "claude-sonnet-4-6",
      aiPromptTokens: promptTokens,
      aiOutputTokens: outputTokens,
    },
  });

  return NextResponse.json({
    data: {
      estimateId: estimate.id,
      suggestedSize: estimate.suggestedSize,
      confidence: estimate.confidence,
      rationale: estimate.rationale,
      flags: aiResponse.flags,
    },
  });
}
