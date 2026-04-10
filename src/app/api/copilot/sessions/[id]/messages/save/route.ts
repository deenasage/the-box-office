// SPEC: ai-copilot.md
// POST /api/copilot/sessions/[id]/messages/save
// Called by the client after the SSE stream completes to persist the assistant message.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { MessageRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  promptTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  contextSnapshot: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

// POST — persist the assistant message after the SSE stream completes
// Body: { content, promptTokens, outputTokens, contextSnapshot? }
// Response: { data: { id: string } }
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const raw = await req.json().catch(() => null);
  if (!raw) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { content, promptTokens, outputTokens, contextSnapshot } = parsed.data;

  // Verify session ownership
  try {
    const copilotSession = await db.copilotSession.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!copilotSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (copilotSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const message = await db.copilotMessage.create({
      data: {
        sessionId: id,
        role: MessageRole.ASSISTANT,
        content,
        aiModel: "claude-sonnet-4-6",
        aiPromptTokens: promptTokens,
        aiOutputTokens: outputTokens,
        contextSnapshot: contextSnapshot ?? null,
      },
      select: { id: true },
    });

    // Update session updatedAt
    await db.copilotSession.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ data: { id: message.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
