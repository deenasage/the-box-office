// SPEC: ai-copilot.md
// POST /api/copilot/sessions/[id]/messages
// Streams Claude's response as Server-Sent Events (SSE).
// The client assembles the full response and saves it via the /save sub-route.
import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth"; // SSE route — uses auth() directly because error responses are text/event-stream, not JSON
import { db } from "@/lib/db";
import { assembleCopilotContext } from "@/lib/ai/copilot-context";
import { streamCopilotResponse } from "@/lib/ai/copilot";
import { MessageRole } from "@prisma/client";

// Prevent Next.js from caching this route
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
});

type Params = { params: Promise<{ id: string }> };

// POST — send a user message and stream Claude's response via SSE
// SSE events: delta { text } | done { promptTokens, outputTokens } | error { error }
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: "Unauthorized" })}\n\n`,
      {
        status: 401,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  const { id } = await params;

  // Validate request body
  let content: string;
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "Message content is required" })}\n\n`,
        {
          status: 400,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }
    content = parsed.data.content;
  } catch {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: "Invalid request body" })}\n\n`,
      {
        status: 400,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  // Verify session ownership
  const copilotSession = await db.copilotSession.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!copilotSession) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: "Session not found" })}\n\n`,
      {
        status: 404,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  if (copilotSession.userId !== session.user.id) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: "Forbidden" })}\n\n`,
      {
        status: 403,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  // Fetch message history (last 10 messages)
  const recentMessages = await db.copilotMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { role: true, content: true },
  });

  const messageHistory = recentMessages
    .reverse()
    .map((m) => ({
      role: m.role === MessageRole.USER ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  // Save the user message to the DB
  await db.copilotMessage.create({
    data: {
      sessionId: id,
      role: MessageRole.USER,
      content,
    },
  });

  // Update session updatedAt
  await db.copilotSession.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  // Assemble context
  const context = await assembleCopilotContext();
  const contextSnapshot = JSON.stringify(context);

  // Build the SSE stream
  const encoder = new TextEncoder();
  const abortController = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { promptTokens, outputTokens } = await streamCopilotResponse(
          messageHistory,
          content,
          context,
          (text) => {
            controller.enqueue(
              encoder.encode(
                `event: delta\ndata: ${JSON.stringify({ text })}\n\n`
              )
            );
          },
          abortController.signal
        );

        // Emit done event — the client will call /save with the assembled text + token counts
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({
              promptTokens,
              outputTokens,
              contextSnapshot,
            })}\n\n`
          )
        );
      } catch (err) {
        console.error("[copilot/messages] Streaming error:", err);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: "Generation failed" })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
