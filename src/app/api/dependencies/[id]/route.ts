// SPEC: dependencies.md
// DELETE /api/dependencies/[id] — ADMIN or TEAM_LEAD — delete a dependency
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    !isPrivileged(session.user.role as UserRole)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const dependency = await db.ticketDependency.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!dependency) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await db.ticketDependency.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Failed to delete dependency:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
