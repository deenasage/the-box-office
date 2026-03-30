// SPEC: sprints.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";
import { SIZE_HOURS } from "@/lib/utils";

const createSchema = z
  .object({
    name: z.string().min(1).max(100),
    notes: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "startDate must be before endDate",
    path: ["endDate"],
  });

// GET /api/sprints — authenticated, returns sprint list with aggregate counts
// Response: { data: Sprint[], total: number, page: number, limit: number }
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const skip = (page - 1) * limit;

  try {
    // Return sprint metadata with aggregate counts only — full ticket arrays are on GET /api/sprints/[id]
    const [sprints, total] = await Promise.all([
      db.sprint.findMany({
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
          tickets: { select: { size: true, status: true } },
          capacities: { select: { points: true } },
        },
        orderBy: { startDate: "desc" },
        take: limit,
        skip,
      }),
      db.sprint.count(),
    ]);

    const result = sprints.map(({ tickets, capacities, ...sprint }) => {
      const committedHours = tickets.reduce(
        (sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0),
        0
      );
      const completedHours = tickets
        .filter((t) => t.status === "DONE")
        .reduce((sum, t) => sum + (t.size ? SIZE_HOURS[t.size] : 0), 0);
      const totalCapacity = capacities.reduce((sum, c) => sum + c.points, 0);
      // ticketCount and doneCount are used by the sidebar sprint progress indicator
      const ticketCount = tickets.length;
      const doneCount = tickets.filter((t) => t.status === "DONE").length;
      return { ...sprint, committedHours, completedHours, totalCapacity, ticketCount, doneCount };
    });

    return NextResponse.json({ data: result, total, page, limit });
  } catch (err) {
    console.error("[GET /api/sprints]", err);
    return NextResponse.json({ error: "Failed to fetch sprints" }, { status: 500 });
  }
}

// POST /api/sprints — ADMIN or TEAM_LEAD only
// Response: { data: Sprint } | { error: string }
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    session.user.role !== UserRole.ADMIN &&
    session.user.role !== UserRole.TEAM_LEAD
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const sprint = await db.sprint.create({
      data: {
        name: parsed.data.name,
        notes: parsed.data.notes,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
      },
    });

    return NextResponse.json({ data: sprint }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/sprints]", err);
    return NextResponse.json({ error: "Failed to create sprint" }, { status: 500 });
  }
}
