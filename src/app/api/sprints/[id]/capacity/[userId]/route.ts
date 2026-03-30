// SPEC: capacity-planning.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Prisma, UserRole } from "@prisma/client";

// DELETE /api/sprints/[id]/capacity/[userId]
// Auth: any authenticated user (ADMIN or TEAM_LEAD may remove capacity entries)
// Deletes the TeamCapacity record for a specific user in a specific sprint.
// Response: 204 No Content on success, 404 if no matching record exists.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.TEAM_LEAD) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: sprintId, userId } = await params;

  // Verify the record exists before attempting delete so we can return a
  // meaningful 404 rather than swallowing a Prisma P2025 silently.
  const existing = await db.teamCapacity.findFirst({
    where: { sprintId, userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Capacity record not found" }, { status: 404 });
  }

  try {
    await db.teamCapacity.delete({
      where: { sprintId_userId: { sprintId, userId } },
    });
  } catch (err) {
    // Guard against a race condition where the record was deleted between
    // the findFirst check and the delete call.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Capacity record not found" }, { status: 404 });
    }
    console.error("[DELETE /api/sprints/[id]/capacity/[userId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // 204 No Content — no body.
  return new NextResponse(null, { status: 204 });
}
