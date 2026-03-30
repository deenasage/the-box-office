// SPEC: brief-to-epic-workflow.md
// Phase 1 — Public share-token routes (no auth required)
// GET  /api/briefs/share/[token]  — look up brief by token; returns 410 if revoked
// POST /api/briefs/share/[token]  — create a BriefComment

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

type RouteContext = { params: Promise<{ token: string }> };

const REVOKED_RESPONSE = NextResponse.json(
  { error: "This review link has been revoked." },
  { status: 410 }
);

async function resolveToken(rawToken: string) {
  const shareToken = await db.briefShareToken.findUnique({
    where: { token: rawToken },
  });
  return shareToken;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  const { token } = await params;
  const shareToken = await resolveToken(token);

  if (!shareToken) {
    // Return the same 410 for not-found as for revoked to avoid token enumeration
    return REVOKED_RESPONSE;
  }
  if (shareToken.revoked) {
    return REVOKED_RESPONSE;
  }
  if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "This review link has expired." }, { status: 410 });
  }

  // Return the full brief — all fields except internal-only ones (storedPath on attachments)
  const brief = await db.brief.findUnique({
    where: { id: shareToken.briefId },
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
    },
  });

  if (!brief) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return comments for this brief (to populate the public comments panel)
  const comments = await db.briefComment.findMany({
    where: { briefId: shareToken.briefId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      authorName: true,
      authorEmail: true,
      body: true,
      resolved: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: { brief, comments, shareTokenId: shareToken.id } });
}

const CommentSchema = z.object({
  authorName: z.string().min(1).max(100),
  authorEmail: z.string().email().max(254).optional(),
  // 10 000-char cap prevents large-payload abuse on this public endpoint
  body: z.string().min(1).max(10_000),
});

export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  const { token } = await params;
  const shareToken = await resolveToken(token);

  if (!shareToken) {
    return REVOKED_RESPONSE;
  }
  if (shareToken.revoked) {
    return REVOKED_RESPONSE;
  }
  if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "This review link has expired." }, { status: 410 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const comment = await db.briefComment.create({
    data: {
      briefId: shareToken.briefId,
      shareTokenId: shareToken.id,
      authorName: parsed.data.authorName,
      authorEmail: parsed.data.authorEmail ?? null,
      body: parsed.data.body,
    },
    select: {
      id: true,
      authorName: true,
      authorEmail: true,
      body: true,
      resolved: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: comment }, { status: 201 });
}
