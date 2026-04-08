// SPEC: handoffs
// GET /api/sprints/[id]/handoffs — requires auth
// Returns { data: HandoffDependency[], nextSprint: { id, name } | null }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { getHandoffsForSprint } from "@/lib/handoffs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Verify the sprint exists and fetch its endDate for the next-sprint lookup
  const sprint = await db.sprint.findUnique({
    where: { id },
    select: { id: true, endDate: true },
  });
  if (!sprint) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }

  // Run handoff query and next-sprint lookup in parallel
  const [handoffs, nextSprint] = await Promise.all([
    getHandoffsForSprint(id),
    db.sprint.findFirst({
      where: {
        startDate: { gt: sprint.endDate },
        isActive: false,
      },
      orderBy: { startDate: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return NextResponse.json({
    data: handoffs,
    nextSprint: nextSprint ?? null,
  });
}
