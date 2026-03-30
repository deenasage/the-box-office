// SPEC: auth.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team, UserRole } from "@prisma/client";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  team: z.nativeEnum(Team).optional(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const teamParam = req.nextUrl.searchParams.get("team");
  const skillsetIdParam = req.nextUrl.searchParams.get("skillsetId");

  let team: Team | undefined;
  if (teamParam !== null) {
    const parsed = z.nativeEnum(Team).safeParse(teamParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid team" }, { status: 400 });
    }
    team = parsed.data;
  }

  // Include skillsets when the caller is filtering by team or skillsetId —
  // both contexts need to know what disciplines each user holds.
  const includeSkillsets = teamParam !== null || skillsetIdParam !== null;

  // Build the where clause. If skillsetId is provided, restrict to users
  // who have that skillset assigned (via the UserSkillset join table).
  const where: Prisma.UserWhereInput = {
    ...(team !== undefined ? { team } : {}),
    ...(skillsetIdParam !== null
      ? { skillsets: { some: { skillsetId: skillsetIdParam } } }
      : {}),
  };

  const users = await db.user.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      team: true,
      ...(includeSkillsets
        ? {
            skillsets: {
              select: {
                skillset: { select: { id: true, name: true, team: true } },
                assignedAt: true,
              },
              orderBy: { assignedAt: "asc" },
            },
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

// POST /api/users — ADMIN only. Creates a new user.
// Response: { data: User (no password) } | { error: string }
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

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, role, team } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await db.user.create({
      data: { name, email, password: passwordHash, role, team: team ?? null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        team: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
