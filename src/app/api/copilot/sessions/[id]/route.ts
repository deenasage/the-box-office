// SPEC: ai-copilot.md
// GET    /api/copilot/sessions/[id] — get session with messages (most recent 50, asc)
// DELETE /api/copilot/sessions/[id] — delete session (owner or ADMIN)
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET — return session + messages (paginated to 50, oldest-first)
// Response: { data: { id, createdAt, messages: CopilotMessage[] } }
export async function GET(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const copilotSession = await db.copilotSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
          select: {
            id: true,
            role: true,
            content: true,
            aiModel: true,
            aiPromptTokens: true,
            aiOutputTokens: true,
            createdAt: true,
            // contextSnapshot excluded from client response — can be large
          },
        },
      },
    });

    if (!copilotSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (copilotSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: copilotSession });
  } catch {
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

// DELETE — delete session; owner or ADMIN only
// Response: { data: { success: true } }
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const copilotSession = await db.copilotSession.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!copilotSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const isOwner = copilotSession.userId === session.user.id;
    const isAdmin = session.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.copilotSession.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
