// SPEC: dependencies.md
// POST /api/dependencies/confirm-ai — ADMIN or TEAM_LEAD — confirm AI-detected dependencies as a batch
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isPrivileged } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { DependencyType, DetectionMethod, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const suggestionSchema = z.object({
  fromTicketId: z.string().cuid(),
  toTicketId: z.string().cuid(),
  type: z.nativeEnum(DependencyType),
  confidence: z.number().min(0).max(1).optional(),
  rationale: z.string().optional(),
});

const bodySchema = z.object({
  suggestions: z.array(suggestionSchema).min(1),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (
    !isPrivileged(session.user.role as UserRole)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { suggestions } = parsed.data;
  let created = 0;
  let skipped = 0;

  // Process each suggestion individually to allow partial success.
  // We cannot use a single $transaction here because a duplicate in the middle
  // would roll back all previously created records — not what the spec requires.
  for (const s of suggestions) {
    // Guard: no self-reference
    if (s.fromTicketId === s.toTicketId) {
      skipped++;
      continue;
    }

    try {
      await db.ticketDependency.create({
        data: {
          fromTicketId: s.fromTicketId,
          toTicketId: s.toTicketId,
          type: s.type,
          detectedBy: DetectionMethod.AI,
          aiConfidence: s.confidence ?? null,
          aiRationale: s.rationale ?? null,
          createdBy: session.user.id,
        },
      });
      created++;
    } catch (err: unknown) {
      // P2002 = unique constraint violation — dependency already exists, skip it
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        skipped++;
      } else {
        console.error("Unexpected error creating AI dependency:", err);
        skipped++;
      }
    }
  }

  return NextResponse.json({ data: { created, skipped } }, { status: 201 });
}
