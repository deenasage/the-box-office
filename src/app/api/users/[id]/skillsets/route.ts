// SPEC: skillsets.md
// GET    /api/users/[id]/skillsets        — list skillsets assigned to a user. Any authenticated user.
// POST   /api/users/[id]/skillsets        — add a skillset to a user { skillsetId }. ADMIN or self.
// PUT    /api/users/[id]/skillsets        — full-replace all skillsets { skillsetIds: string[] }. ADMIN or self.
// DELETE /api/users/[id]/skillsets        — remove a skillset from a user { skillsetId }. ADMIN or self.
// Response shape: { data: T } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const skillsetIdSchema = z.object({
  skillsetId: z.string().cuid(),
});

// GET /api/users/[id]/skillsets — authenticated, any role
// Returns: { data: { id, skillsetId, assignedAt, skillset: { id, name, team } }[] }
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Verify user exists before returning an empty list — avoids ambiguity.
  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userSkillsets = await db.userSkillset.findMany({
    where: { userId: id },
    include: {
      skillset: { select: { id: true, name: true, team: true } },
    },
    orderBy: { assignedAt: "asc" },
  });

  return NextResponse.json({ data: userSkillsets });
}

// POST /api/users/[id]/skillsets — ADMIN or the user themselves
// Body: { skillsetId: string }
// Returns 201: { data: UserSkillset with skillset } | 409 if already assigned
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const isSelf = session.user.id === id;
  const isAdmin = session.user.role === UserRole.ADMIN;

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify target user exists.
  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = skillsetIdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify the skillset exists before creating the join record.
  const skillset = await db.skillset.findUnique({
    where: { id: parsed.data.skillsetId },
    select: { id: true, name: true, team: true },
  });
  if (!skillset) {
    return NextResponse.json({ error: "Skillset not found" }, { status: 404 });
  }

  try {
    const userSkillset = await db.userSkillset.create({
      data: {
        userId: id,
        skillsetId: parsed.data.skillsetId,
      },
      include: {
        skillset: { select: { id: true, name: true, team: true } },
      },
    });
    return NextResponse.json({ data: userSkillset }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "User already has this skillset" },
        { status: 409 }
      );
    }
    console.error("[POST /api/users/:id/skillsets]", e);
    return NextResponse.json({ error: "Failed to assign skillset" }, { status: 500 });
  }
}

// PUT /api/users/[id]/skillsets — ADMIN or the user themselves
// Full-replace semantics: atomically deletes all existing skillset assignments for the user
// and inserts the supplied list. Accepts an empty array to clear all skillsets.
// Body: { skillsetIds: string[] }
// Returns 200: { data: UserSkillset[] with skillset }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const isSelf = session.user.id === id;
  const isAdmin = session.user.role === UserRole.ADMIN;

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify target user exists.
  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const putSchema = z.object({
    skillsetIds: z.array(z.string().cuid()),
  });
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { skillsetIds } = parsed.data;

  // Verify all referenced skillsets exist before touching the database.
  if (skillsetIds.length > 0) {
    const found = await db.skillset.findMany({
      where: { id: { in: skillsetIds } },
      select: { id: true },
    });
    if (found.length !== skillsetIds.length) {
      const foundIds = new Set(found.map((s) => s.id));
      const missing = skillsetIds.filter((sid) => !foundIds.has(sid));
      return NextResponse.json(
        { error: `Skillset(s) not found: ${missing.join(", ")}` },
        { status: 404 }
      );
    }
  }

  // Atomic full-replace in a transaction: delete all then insert the new set.
  try {
    await db.$transaction(async (tx) => {
      await tx.userSkillset.deleteMany({ where: { userId: id } });
      for (const skillsetId of skillsetIds) {
        await tx.userSkillset.create({ data: { userId: id, skillsetId } });
      }
    });
  } catch (e) {
    console.error("[PUT /api/users/:id/skillsets]", e);
    return NextResponse.json({ error: "Failed to replace skillsets" }, { status: 500 });
  }

  // Return the updated list so the caller can refresh its local state.
  const updated = await db.userSkillset.findMany({
    where: { userId: id },
    include: {
      skillset: { select: { id: true, name: true, team: true } },
    },
    orderBy: { assignedAt: "asc" },
  });

  return NextResponse.json({ data: updated });
}

// DELETE /api/users/[id]/skillsets — ADMIN or the user themselves
// Body: { skillsetId: string }
// Returns 204 No Content
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const isSelf = session.user.id === id;
  const isAdmin = session.user.role === UserRole.ADMIN;

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = skillsetIdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await db.userSkillset.delete({
      where: {
        userId_skillsetId: {
          userId: id,
          skillsetId: parsed.data.skillsetId,
        },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json(
        { error: "Skillset assignment not found" },
        { status: 404 }
      );
    }
    console.error("[DELETE /api/users/:id/skillsets]", e);
    return NextResponse.json({ error: "Failed to remove skillset" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
