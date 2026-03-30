// SPEC: skillsets.md
// PATCH  /api/skillsets/[id] — ADMIN only. Update name, color, or isActive.
// DELETE /api/skillsets/[id] — ADMIN only. Cascade is handled by DB (UserSkillset, Ticket.requiredSkillset).
// Response: { data: Skillset } | 204 No Content | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole, Prisma } from "@prisma/client";

const patchSkillsetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "color must be a 6-digit hex e.g. #7c3aed").optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/skillsets/[id] — ADMIN only
// Body: { name?: string, color?: string, isActive?: boolean }
// Returns 200: { data: Skillset }
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

  const parsed = patchSkillsetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const skillset = await db.skillset.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ data: skillset });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Skillset not found" }, { status: 404 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A skillset with this name already exists for the given team scope" },
        { status: 409 }
      );
    }
    console.error("[PATCH /api/skillsets/:id]", e);
    return NextResponse.json({ error: "Failed to update skillset" }, { status: 500 });
  }
}

// DELETE /api/skillsets/[id] — ADMIN only
// On success: 204 No Content
// UserSkillset rows cascade-delete via schema onDelete: Cascade.
// Ticket.requiredSkillsetId is set to null via schema onDelete: SetNull.
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
    await db.skillset.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Skillset not found" }, { status: 404 });
    }
    console.error("[DELETE /api/skillsets/:id]", e);
    return NextResponse.json({ error: "Failed to delete skillset" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
