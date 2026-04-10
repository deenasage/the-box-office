// POST /api/admin/view-mode — ADMIN only. Sets the adminViewMode cookie.
// Body: { mode: "craft" | "stakeholder" }
// The cookie is HTTP-only and controls how My Work / My Tickets queries run for ADMINs.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const schema = z.object({
  mode: z.enum(["craft", "stakeholder"]),
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const res = NextResponse.json({ data: { mode: parsed.data.mode } });
  res.cookies.set("adminViewMode", parsed.data.mode, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Session cookie — no maxAge so it expires when the browser closes.
    // Admin can toggle again at any time.
  });

  return res;
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mode = req.cookies.get("adminViewMode")?.value ?? "craft";
  return NextResponse.json({ data: { mode } });
}
