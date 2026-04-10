// SPEC: users.md
// GET  /api/account — Auth: any authenticated. Returns current user profile.
// PATCH /api/account — Auth: any authenticated. Updates name, email, or password.
// Response: { data: { id, name, email, role, team } } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PatchAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

// Minimal safe projection — never return the password hash
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  team: true,
} as const;

// GET /api/account — return current user profile
export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: USER_SELECT,
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ data: user });
}

// PATCH /api/account — update name, email, or password
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, currentPassword, newPassword } = parsed.data;

  // If the caller wants to change the password, both fields are required
  if (newPassword !== undefined && currentPassword === undefined) {
    return NextResponse.json(
      { error: "currentPassword is required when setting a new password" },
      { status: 400 }
    );
  }

  // Bail early if there is nothing to do
  if (name === undefined && email === undefined && newPassword === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Fetch the stored record — needed to verify currentPassword
  const existingUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });
  if (!existingUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Build the update payload
  const updateData: Prisma.UserUpdateInput = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;

  if (newPassword !== undefined && currentPassword !== undefined) {
    const passwordMatches = await compare(currentPassword, existingUser.password);
    if (!passwordMatches) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    updateData.password = await hash(newPassword, 12);
  }

  try {
    const updated = await db.user.update({
      where: { id: existingUser.id },
      data: updateData,
      select: USER_SELECT,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    // P2002 = unique constraint violated — email already in use
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    console.error("[PATCH /api/account]", err);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
