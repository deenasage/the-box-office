// SPEC: ai-brief.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { BriefStatus, UserRole } from "@prisma/client";
import { generateBrief, ClarificationItem } from "@/lib/ai/brief-generator";
import { z } from "zod";

const ClarificationItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string().nullable(),
  answered: z.boolean(),
});

const RefineBodySchema = z.object({
  clarifications: z.array(ClarificationItemSchema).default([]),
});

function canMutate(
  session: { user: { id: string; role: UserRole } },
  creatorId: string
) {
  return (
    session.user.id === creatorId ||
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.TEAM_LEAD
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const brief = await db.brief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canMutate(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (brief.status === BriefStatus.GENERATING) {
    return NextResponse.json(
      { error: "Brief generation is already in progress." },
      { status: 409 }
    );
  }
  if (brief.status !== BriefStatus.REVIEW) {
    return NextResponse.json({ error: "Brief must be in REVIEW state to refine." }, { status: 400 });
  }

  // Accept updated clarification answers from the request body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bodyParsed = RefineBodySchema.safeParse(rawBody);
  if (!bodyParsed.success) {
    return NextResponse.json({ error: bodyParsed.error.flatten() }, { status: 400 });
  }
  const clarifications: ClarificationItem[] = bodyParsed.data.clarifications;

  // Persist the user's answers before calling Claude
  await db.brief.update({
    where: { id },
    data: {
      status: BriefStatus.GENERATING,
      clarifications: JSON.stringify(clarifications),
    },
  });

  try {
    const rawInput = JSON.parse(brief.rawInput) as {
      textFields?: Record<string, string>;
    };
    const rawTextFields = Object.entries(rawInput.textFields ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n\n");

    const result = await generateBrief({
      rawTextFields,
      extractedText: brief.extractedText ?? "",
      previousClarifications: clarifications,
    });

    // Merge: preserve any manual edits to sections Claude doesn't re-provide
    await db.brief.update({
      where: { id },
      data: {
        status: BriefStatus.REVIEW,
        objective: result.objective ?? brief.objective,
        targetAudience: result.targetAudience ?? brief.targetAudience,
        deliverables: JSON.stringify(result.deliverables),
        dependencies: JSON.stringify(result.dependencies),
        requiredTeams: JSON.stringify(result.requiredTeams),
        timeline: result.timeline ?? brief.timeline,
        successMetrics: JSON.stringify(result.successMetrics),
        clarifications: JSON.stringify(result.clarifications),
        aiPromptTokens: (brief.aiPromptTokens ?? 0) + result.promptTokens,
        aiOutputTokens: (brief.aiOutputTokens ?? 0) + result.outputTokens,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    await db.brief.update({ where: { id }, data: { status: BriefStatus.REVIEW } });
    console.error("Brief refinement failed:", err);
    return NextResponse.json(
      { error: "Brief generation failed — please try again." },
      { status: 500 }
    );
  }
}
