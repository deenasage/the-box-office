// SPEC: ai-brief.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { z } from "zod";
import { UserRole, BriefStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const BRIEF_TYPE_VALUES = ["GTM", "CAMPAIGN_LAUNCH", "CAMPAIGN_UPDATE", "PROBLEM_STATEMENT"] as const;

const CreateSchema = z.object({
  title: z.string().min(1),
  rawInput: z.string(), // JSON string
  briefType: z.enum(BRIEF_TYPE_VALUES).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const epicId = searchParams.get("epicId") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  // Validate the status query param against the BriefStatus enum
  let status: BriefStatus | undefined;
  const statusParam = searchParams.get("status");
  if (statusParam) {
    const parsed = z.nativeEnum(BriefStatus).safeParse(statusParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }
    status = parsed.data;
  }

  const isAdmin =
    session.user.role === UserRole.ADMIN ||
    isTeamLead(session.user.role as UserRole);

  const briefs = await db.brief.findMany({
    where: {
      ...(isAdmin ? {} : { creatorId: session.user.id }),
      ...(status ? { status } : {}),
      ...(epicId ? { epicId } : {}),
    },
    include: {
      creator: { select: { id: true, name: true } },
      epic: { select: { id: true, name: true } },
      // shareTokens count lets the front end display "Under Review" when status === REVIEW
      // and at least one non-revoked share link exists (display-only; DB status stays REVIEW)
      _count: { select: { attachments: true, tickets: true, shareTokens: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json(briefs);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let brief;
  try {
    brief = await db.brief.create({
      data: {
        title: parsed.data.title,
        rawInput: parsed.data.rawInput,
        creatorId: session.user.id,
        ...(parsed.data.briefType ? { briefType: parsed.data.briefType } : {}),
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });
  } catch (err) {
    console.error("[POST /api/briefs] db.brief.create failed:", err);
    return NextResponse.json({ error: "Failed to create brief" }, { status: 500 });
  }

  return NextResponse.json(brief, { status: 201 });
}
