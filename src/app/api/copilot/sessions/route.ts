// SPEC: ai-copilot.md
// GET  /api/copilot/sessions — list current user's sessions
// POST /api/copilot/sessions — create a new session
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { MessageRole } from "@prisma/client";

// GET — list sessions for the current user
// Response: { data: { id: string; createdAt: string; preview: string }[] }
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const sessions = await db.copilotSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          where: { role: MessageRole.USER },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { content: true },
        },
      },
    });

    const data = sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      preview: s.messages[0]?.content.slice(0, 60) ?? "",
    }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

// POST — create a new session for the current user
// Response: { data: { id: string } }
export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const newSession = await db.copilotSession.create({
      data: { userId: session.user.id },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: newSession.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
