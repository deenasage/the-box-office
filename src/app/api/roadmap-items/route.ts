// SPEC: roadmap.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { RoadmapItemStatus, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  tier: z.string().optional(),
  category: z.string().optional(),
  initiative: z.string().optional(),
  region: z.string().optional(),
  title: z.string().min(1).max(500),
  ownerId: z.string().nullish(),
  status: z.nativeEnum(RoadmapItemStatus).optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "period must be YYYY-MM"),
  startDate: z.string().datetime().nullish(),
  endDate: z.string().datetime().nullish(),
  notes: z.string().nullish(),
  sortOrder: z.number().int().optional(),
});

// GET /api/roadmap-items — filterable list
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const tier = searchParams.get("tier");
  const category = searchParams.get("category");
  const initiative = searchParams.get("initiative");
  const region = searchParams.get("region");
  const ownerId = searchParams.get("ownerId");
  const status = searchParams.get("status") as RoadmapItemStatus | null;
  const periodFrom = searchParams.get("periodFrom");
  const periodTo = searchParams.get("periodTo");

  const where: Record<string, unknown> = {};
  if (tier) where.tier = { contains: tier };
  if (category) where.category = { contains: category };
  if (initiative) where.initiative = { contains: initiative };
  if (region) where.region = { contains: region };
  if (ownerId) where.ownerId = ownerId;
  if (status && Object.values(RoadmapItemStatus).includes(status)) where.status = status;
  if (periodFrom || periodTo) {
    where.period = {
      ...(periodFrom ? { gte: periodFrom } : {}),
      ...(periodTo ? { lte: periodTo } : {}),
    };
  }

  const items = await db.roadmapItem.findMany({
    where,
    include: { owner: { select: { id: true, name: true, team: true } } },
    orderBy: [{ period: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ data: items });
}

// POST /api/roadmap-items — ADMIN or TEAM_LEAD only
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    !isPrivileged(session.user.role as UserRole)
  ) {
    return NextResponse.json({ error: "Forbidden — admin or team lead required" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const item = await db.roadmapItem.create({
      data: {
        ...parsed.data,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      },
      include: { owner: { select: { id: true, name: true, team: true } } },
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create roadmap item" }, { status: 500 });
  }
}
