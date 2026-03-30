// SPEC: search.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q") ?? "";

  // Minimum 2 characters to avoid excessive DB load
  if (q.trim().length < 2) {
    return NextResponse.json({ data: { tickets: [], epics: [], briefs: [] } });
  }

  const [tickets, epics, briefs] = await Promise.all([
    db.ticket.findMany({
      where: { title: { contains: q } },
      select: { id: true, title: true, status: true, team: true },
      take: 5,
    }),
    db.epic.findMany({
      where: { name: { contains: q } },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
    db.brief.findMany({
      where: {
        title: { contains: q },
        status: { not: "ARCHIVED" },
      },
      select: { id: true, title: true, status: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ data: { tickets, epics, briefs } });
}
