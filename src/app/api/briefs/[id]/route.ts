// SPEC: ai-brief.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { z } from "zod";
import { BriefStatus, UserRole } from "@prisma/client";

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  rawInput: z.string().optional(),
  epicId: z.string().nullable().optional(),
});

function canMutate(
  session: { user: { id: string; role: UserRole } },
  creatorId: string
) {
  return (
    session.user.id === creatorId ||
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.TEAM_LEAD
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const brief = await db.brief.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      epic: { select: { id: true, name: true } },
      attachments: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
          // storedPath intentionally omitted — server-only
        },
      },
      tickets: {
        select: { id: true, title: true, team: true, status: true },
      },
      // _count.shareTokens > 0 means the brief has at least one active share link
      // Front end uses this to display "Under Review" instead of "Review"
      _count: { select: { shareTokens: true } },
    },
  });

  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin =
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.TEAM_LEAD;

  if (!isAdmin && brief.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(brief);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const brief = await db.brief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canMutate(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (brief.status !== BriefStatus.DRAFT && brief.status !== BriefStatus.REVIEW) {
    return NextResponse.json({ error: "Cannot edit brief in current state" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let updated;
  try {
    updated = await db.brief.update({
      where: { id },
      data: parsed.data,
    });
  } catch {
    return NextResponse.json({ error: "Failed to update brief" }, { status: 500 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/briefs/[id] — auth required; creator, ADMIN, or TEAM_LEAD only
// Only DRAFT, GENERATING, or REVIEW briefs can be deleted (hard delete)
// Returns 204 on success
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const brief = await db.brief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canMutate(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deletableStatuses: BriefStatus[] = [
    BriefStatus.DRAFT,
    BriefStatus.GENERATING,
    BriefStatus.REVIEW,
  ];
  if (!deletableStatuses.includes(brief.status)) {
    return NextResponse.json(
      { error: "Only briefs in DRAFT, GENERATING, or REVIEW status can be deleted" },
      { status: 400 }
    );
  }

  try {
    await db.brief.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Failed to delete brief" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
