// SPEC: ai-estimation.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; estimateId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, estimateId } = await params;

  const estimate = await db.aIEstimate.findUnique({
    where: { id: estimateId },
    select: { id: true, ticketId: true },
  });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (estimate.ticketId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Dismiss is a no-op on ticket.size — the estimate record is left as-is (not accepted).
  // The client uses this to close the panel without applying the size.
  return NextResponse.json({ dismissed: true });
}
