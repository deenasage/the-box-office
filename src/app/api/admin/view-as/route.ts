// POST /api/admin/view-as — ADMIN only. Sets/clears the viewAsUserId cookie.
// Body: { userId: string } to impersonate, or { userId: null } to exit.
// GET  /api/admin/view-as — returns current effective user id.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";

const schema = z.object({
  userId: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });

  if (parsed.data.userId) {
    // Cannot impersonate another ADMIN
    res.cookies.set("viewAsUserId", parsed.data.userId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    res.cookies.delete("viewAsUserId");
  }

  return res;
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = req.cookies.get("viewAsUserId")?.value ?? null;
  return NextResponse.json({ data: { userId } });
}
