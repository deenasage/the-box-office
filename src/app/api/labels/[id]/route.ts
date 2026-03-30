// SPEC: labels.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole, Prisma } from "@prisma/client";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const patchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(HEX_COLOR_RE, "Color must be a valid hex string (#rrggbb)")
    .optional(),
});

// PATCH /api/labels/[id]
// Auth: ADMIN only
// Body: { name?: string, color?: string }
// Response 200: { data: { id, name, color } }
// Response 400: validation failure or no fields provided
// Response 403: insufficient role
// Response 404: label not found (P2025)
// Response 409: duplicate label name (P2002)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.name === undefined && parsed.data.color === undefined) {
    return NextResponse.json(
      { error: "At least one of name or color must be provided" },
      { status: 400 }
    );
  }

  try {
    const label = await db.label.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
      },
      select: { id: true, name: true, color: true },
    });

    return NextResponse.json({ data: label });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Label not found" }, { status: 404 });
      }
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "A label with this name already exists." },
          { status: 409 }
        );
      }
    }
    console.error("[PATCH /api/labels/[id]]", err);
    return NextResponse.json({ error: "Failed to update label" }, { status: 500 });
  }
}

// DELETE /api/labels/[id]
// Auth: ADMIN only
// Response 204: no body — TicketLabel rows are removed by onDelete: Cascade on the join table
// Response 403: insufficient role
// Response 404: label not found (P2025)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await db.label.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }
    console.error("[DELETE /api/labels/[id]]", err);
    return NextResponse.json({ error: "Failed to delete label" }, { status: 500 });
  }
}
