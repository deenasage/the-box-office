// SPEC: my-work.md
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { defaultHoursPerDay, defaultWorkdaysPerWeek } = body as Record<string, unknown>;

  if (
    defaultHoursPerDay !== undefined &&
    (typeof defaultHoursPerDay !== "number" || defaultHoursPerDay <= 0 || defaultHoursPerDay > 24)
  ) {
    return NextResponse.json({ error: "defaultHoursPerDay must be between 0 and 24" }, { status: 400 });
  }
  if (
    defaultWorkdaysPerWeek !== undefined &&
    (typeof defaultWorkdaysPerWeek !== "number" || defaultWorkdaysPerWeek < 1 || defaultWorkdaysPerWeek > 7)
  ) {
    return NextResponse.json({ error: "defaultWorkdaysPerWeek must be between 1 and 7" }, { status: 400 });
  }

  const update: { defaultHoursPerDay?: number; defaultWorkdaysPerWeek?: number } = {};
  if (typeof defaultHoursPerDay === "number") update.defaultHoursPerDay = defaultHoursPerDay;
  if (typeof defaultWorkdaysPerWeek === "number") update.defaultWorkdaysPerWeek = defaultWorkdaysPerWeek;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const user = await db.user.update({ where: { id: session.user.id }, data: update });
  return NextResponse.json({ defaultHoursPerDay: user.defaultHoursPerDay, defaultWorkdaysPerWeek: user.defaultWorkdaysPerWeek });
}
