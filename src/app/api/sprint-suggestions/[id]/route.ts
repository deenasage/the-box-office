// SPEC: capacity-ai.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const suggestion = await db.sprintSuggestion.findUnique({ where: { id } });
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...suggestion,
    ticketIds: JSON.parse(suggestion.ticketIds),
    scenarios: JSON.parse(suggestion.scenarios),
    recommendation: suggestion.recommendation
      ? JSON.parse(suggestion.recommendation)
      : null,
  });
}
