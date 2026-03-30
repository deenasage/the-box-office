// SPEC: ai-estimation.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; estimateId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { role } = session.user;
  if (role !== UserRole.ADMIN && role !== UserRole.TEAM_LEAD) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, estimateId } = await params;

  const estimate = await db.aIEstimate.findUnique({
    where: { id: estimateId },
    select: { id: true, ticketId: true, suggestedSize: true, accepted: true },
  });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (estimate.ticketId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (estimate.accepted) return NextResponse.json({ error: "Already accepted" }, { status: 409 });

  await db.$transaction(async (tx) => {
    await tx.aIEstimate.update({
      where: { id: estimateId },
      data: {
        accepted: true,
        acceptedBy: session.user.id,
        acceptedAt: new Date(),
      },
    });
    await tx.ticket.update({
      where: { id },
      data: { size: estimate.suggestedSize },
    });
  });

  return NextResponse.json({ accepted: true, appliedSize: estimate.suggestedSize });
}
