// SPEC: users.md
// PATCH /api/users/[id] — Auth: ADMIN or TEAM_LEAD. Updates name, role, or team for a user.
// DELETE /api/users/[id] — Auth: ADMIN only. Cannot delete yourself.
// Response: { data: User (no password) } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { UserRole, Team, StakeholderTeam, Prisma } from "@prisma/client";

const UpdateUserSchema = z.object({
  name: z.string().min(1, "Name must not be empty").max(255).optional(),
  email: z.string().email("Invalid email address").max(255).optional(),
  role: z.nativeEnum(UserRole).optional(),
  team: z.nativeEnum(Team).nullable().optional(),
  stakeholderTeam: z.nativeEnum(StakeholderTeam).nullable().optional(),
});

function requireAdminOrLead(role: UserRole): NextResponse | null {
  if (role !== UserRole.ADMIN && !isTeamLead(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const denied = requireAdminOrLead(session.user.role);
  if (denied) return denied;

  const { id } = await params;

  // Reject empty body early
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

  // Reject requests that change nothing
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // TEAM_LEADs may only update name — not role or team
  if (isTeamLead(session.user.role as UserRole)) {
    if (parsed.data.role !== undefined || parsed.data.team !== undefined) {
      return NextResponse.json(
        { error: "Team leads may only update a user's name" },
        { status: 403 }
      );
    }
  }

  // Confirm the target user exists before attempting the update
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // TEAM_LEADs cannot modify an ADMIN user
  if (isTeamLead(session.user.role as UserRole) && existing.role === UserRole.ADMIN) {
    return NextResponse.json({ error: "Cannot modify an admin user" }, { status: 403 });
  }

  try {
    const updated = await db.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        team: true,
        stakeholderTeam: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] — ADMIN only. Cannot delete yourself.
// Response: 204 | { error: string }
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
    await db.user.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
