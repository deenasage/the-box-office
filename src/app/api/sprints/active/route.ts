// SPEC: sprints.md
// GET /api/sprints/active — Auth: any authenticated.
// Returns the currently active sprint with ticket counts, or 404 if none is active.
// Response: { data: Sprint & { ticketCount: number } } | { error: string }

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const sprint = await db.sprint.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      notes: true,
      startDate: true,
      endDate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { tickets: true } },
    },
  });

  if (!sprint) {
    return NextResponse.json({ error: "No active sprint" }, { status: 404 });
  }

  return NextResponse.json({ data: sprint });
}
