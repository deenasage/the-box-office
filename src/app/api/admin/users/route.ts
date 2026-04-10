// SPEC: users.md
// GET  /api/admin/users — ADMIN only. Returns all users (no password field).
// POST /api/admin/users — ADMIN only. Creates a user with hashed password.
// Response: { data: User[] } | { data: User } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole, Team, StakeholderTeam, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  team: true,
  stakeholderTeam: true,
  createdAt: true,
} as const;

const CreateUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  team: z.nativeEnum(Team).optional(),
  stakeholderTeam: z.nativeEnum(StakeholderTeam).optional(),
});

// GET /api/admin/users — ADMIN only
export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db.user.findMany({
    select: userSelect,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: users });
}

// POST /api/admin/users — ADMIN only
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

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, role, team, stakeholderTeam } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await db.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role,
        team: team ?? null,
        stakeholderTeam: stakeholderTeam ?? null,
      },
      select: userSelect,
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
