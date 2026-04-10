// SPEC: admin-lists.md
// GET  /api/list-values          — returns all ListValues, or only those matching ?key=
// POST /api/list-values          — creates a new ListValue; 409 if [listKey, value] pair already exists
// Auth required for all methods; ADMIN role required for POST
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const LIST_KEYS = ["team", "tier", "category", "region"] as const;
type ListKey = (typeof LIST_KEYS)[number];

const CreateListValueSchema = z.object({
  listKey: z.enum(LIST_KEYS),
  value: z.string().min(1, "Value is required").max(255),
  sortOrder: z.number().int().optional(),
});

// GET /api/list-values?key=tier
export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const key = request.nextUrl.searchParams.get("key");

  if (key !== null && !(LIST_KEYS as readonly string[]).includes(key)) {
    return NextResponse.json(
      { error: `Invalid key. Must be one of: ${LIST_KEYS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const values = await db.listValue.findMany({
      where: key ? { listKey: key as ListKey } : undefined,
      orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
    });
    return NextResponse.json({ data: values });
  } catch (err) {
    console.error("[GET /api/list-values]", err);
    return NextResponse.json({ error: "Failed to fetch list values" }, { status: 500 });
  }
}

// POST /api/list-values
export async function POST(request: NextRequest) {
  const { error } = await requireRole(UserRole.ADMIN);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateListValueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { listKey, value, sortOrder } = parsed.data;

  try {
    const created = await db.listValue.create({
      data: {
        listKey,
        value,
        sortOrder: sortOrder ?? 0,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: unknown) {
    // Prisma unique constraint violation — P2002
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: `Value "${value}" already exists for list key "${listKey}"` },
        { status: 409 }
      );
    }
    console.error("[POST /api/list-values]", err);
    return NextResponse.json({ error: "Failed to create list value" }, { status: 500 });
  }
}
