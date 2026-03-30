// SPEC: sprint-scrum.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";

// GET /api/admin/deletion-log — ADMIN only.
// Returns the last 100 deletion log entries ordered by createdAt desc.
export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await db.deletionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      deletedBy: { select: { name: true } },
      restoredBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ data: logs });
}
