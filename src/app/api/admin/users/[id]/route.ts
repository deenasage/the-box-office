// SPEC: users.md
// PATCH  /api/admin/users/[id] — ADMIN only. Updates name, email, role, team.
// DELETE /api/admin/users/[id] — ADMIN only. Nulls assigneeId on their tickets first, then hard-deletes.
// Response: { data: User (no password) } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole, Team, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  team: true,
  createdAt: true,
} as const;

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  role: z.nativeEnum(UserRole).optional(),
  team: z.nativeEnum(Team).nullable().optional(),
});

// PATCH /api/admin/users/[id] — ADMIN only
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

  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const updated = await db.user.update({
      where: { id },
      data: parsed.data,
      select: userSelect,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] — ADMIN only.
// Nulls assigneeId and creatorId FK references in a transaction before deleting.
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

  if (session.user.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await db.$transaction(async (tx) => {
      // Null out assigneeId on any tickets assigned to this user
      await tx.ticket.updateMany({
        where: { assigneeId: id },
        data: { assigneeId: null },
      });
      // Reassign created tickets to the deleting admin so the FK doesn't break
      // (Ticket.creatorId is non-nullable, so we cannot null it out)
      await tx.ticket.updateMany({
        where: { creatorId: id },
        data: { creatorId: session.user.id },
      });
      // Delete the user
      await tx.user.delete({ where: { id } });
    });
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
