// SPEC: roadmap.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { RoadmapItemStatus, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  tier: z.string().nullish(),
  category: z.string().nullish(),
  initiative: z.string().nullish(),
  region: z.string().nullish(),
  title: z.string().min(1).max(500).optional(),
  // RoadmapSpreadsheetRow sends this flag when the user manually edits the title
  // so that syncRoadmapItem knows not to overwrite it on the next epic update.
  titleManuallyEdited: z.boolean().optional(),
  ownerId: z.string().nullish(),
  status: z.nativeEnum(RoadmapItemStatus).optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  startDate: z.string().datetime().nullish(),
  endDate: z.string().datetime().nullish(),
  notes: z.string().nullish(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    !isPrivileged(session.user.role as UserRole)
  ) {
    return NextResponse.json({ error: "Forbidden — admin or team lead required" }, { status: 403 });
  }
  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await db.roadmapItem.update({
    where: { id },
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate !== undefined ? (parsed.data.startDate ? new Date(parsed.data.startDate) : null) : undefined,
      endDate: parsed.data.endDate !== undefined ? (parsed.data.endDate ? new Date(parsed.data.endDate) : null) : undefined,
    },
    include: { owner: { select: { id: true, name: true, team: true } } },
  }).catch(() => null);

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    !isPrivileged(session.user.role as UserRole)
  ) {
    return NextResponse.json({ error: "Forbidden — admin or team lead required" }, { status: 403 });
  }
  const { id } = await params;
  const deleted = await db.roadmapItem.delete({ where: { id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
