// SPEC: roadmap.md
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const CreateMilestoneSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().nullish(),
  color: z.string().optional(),
});

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const milestones = await db.milestone.findMany({
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ data: milestones });
  } catch (err) {
    console.error("[GET /api/milestones]", err);
    return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN && !isTeamLead(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await request.json();
  const parsed = CreateMilestoneSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, date, description, color } = parsed.data;

  try {
    const milestone = await db.milestone.create({
      data: {
        name,
        date: new Date(date),
        description: description ?? null,
        color: color ?? "#6366f1",
      },
    });
    return NextResponse.json({ data: milestone }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/milestones]", err);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }
}
