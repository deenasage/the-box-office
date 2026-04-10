// SPEC: labels.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or fewer"),
  color: z
    .string()
    .regex(HEX_COLOR_RE, "Color must be a valid hex string (#rrggbb)")
    .optional(),
});

// GET /api/labels
// Auth: any authenticated user
// Returns all labels ordered by name, including ticket count.
// Response: { data: { id, name, color, _count: { tickets } }[] }
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  const labels = await db.label.findMany({
    where: search
      ? { name: { contains: search } }
      : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      _count: {
        select: { tickets: true },
      },
    },
  });

  return NextResponse.json({ data: labels });
}

// POST /api/labels
// Auth: ADMIN only
// Body: { name: string, color?: string }
// Response 201: { data: { id, name, color } }
// Response 400: validation failure
// Response 403: insufficient role
// Response 409: duplicate label name
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const label = await db.label.create({
      data: {
        name: parsed.data.name,
        ...(parsed.data.color ? { color: parsed.data.color } : {}),
      },
      select: { id: true, name: true, color: true },
    });

    return NextResponse.json({ data: label }, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A label with this name already exists." },
        { status: 409 }
      );
    }
    console.error("[POST /api/labels]", err);
    return NextResponse.json({ error: "Failed to create label" }, { status: 500 });
  }
}
