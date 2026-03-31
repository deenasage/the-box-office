// SPEC: ai-brief.md, gtm-brief-generator.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { z } from "zod";
import { BriefStatus, UserRole } from "@prisma/client";

const SectionsSchema = z.object({
  objective: z.string().optional(),
  targetAudience: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  requiredTeams: z.array(z.string()).optional(),
  timeline: z.string().optional(),
  successMetrics: z.array(z.string()).optional(),
  // GTM brief: full briefData JSON string — parsed and re-stringified to validate it is valid JSON
  briefData: z.string().optional(),
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
  if (brief.status !== BriefStatus.REVIEW) {
    return NextResponse.json({ error: "Sections can only be edited in REVIEW state." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = SectionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  // If briefData is supplied, validate it is parseable JSON before storing
  if (d.briefData !== undefined) {
    try {
      JSON.parse(d.briefData);
    } catch {
      return NextResponse.json(
        { error: "briefData must be a valid JSON string." },
        { status: 400 }
      );
    }
  }

  const updated = await db.brief.update({
    where: { id },
    data: {
      ...(d.objective !== undefined ? { objective: d.objective } : {}),
      ...(d.targetAudience !== undefined ? { targetAudience: d.targetAudience } : {}),
      ...(d.deliverables !== undefined ? { deliverables: JSON.stringify(d.deliverables) } : {}),
      ...(d.dependencies !== undefined ? { dependencies: JSON.stringify(d.dependencies) } : {}),
      ...(d.requiredTeams !== undefined ? { requiredTeams: JSON.stringify(d.requiredTeams) } : {}),
      ...(d.timeline !== undefined ? { timeline: d.timeline } : {}),
      ...(d.successMetrics !== undefined ? { successMetrics: JSON.stringify(d.successMetrics) } : {}),
      ...(d.briefData !== undefined ? { briefData: d.briefData } : {}),
    },
  });

  return NextResponse.json(updated);
}
