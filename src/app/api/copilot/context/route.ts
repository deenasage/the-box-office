// SPEC: ai-copilot.md
// GET /api/copilot/context — ADMIN only, returns the assembled CopilotContext as JSON
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { assembleCopilotContext } from "@/lib/ai/copilot-context";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET — returns the current assembled CopilotContext; useful for debugging
// Auth: ADMIN only
// Response: { data: CopilotContext }
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const context = await assembleCopilotContext();
    return NextResponse.json({ data: context });
  } catch {
    return NextResponse.json({ error: "Failed to assemble context" }, { status: 500 });
  }
}
