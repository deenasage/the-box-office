// SPEC: guest-intake.md
// POST /api/intake — PUBLIC. No auth required.
// Accepts a guest intake form submission and creates a ticket.
// The ticket is attributed to the first ADMIN user as a system creator.
// Response: { data: { id: string; team: string } } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { detectTeam } from "@/lib/routing";
import { UserRole, TicketStatus } from "@prisma/client";

const IntakeSchema = z.object({
  formData: z.record(z.string(), z.unknown()),
  templateId: z.string().optional(),
  submitterName: z.string().max(255).optional(),
  submitterEmail: z.string().email().max(255).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { formData, templateId, submitterName, submitterEmail } = parsed.data;

  // Guest submissions need a valid creatorId FK — use the first admin user
  const adminUser = await db.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!adminUser) {
    return NextResponse.json(
      { error: "No admin user configured. Cannot accept submissions at this time." },
      { status: 503 }
    );
  }

  // Derive a human-readable title from form data
  const titleFromForm =
    (formData["title"] as string | undefined) ||
    (formData["name"] as string | undefined) ||
    (formData["project"] as string | undefined) ||
    (formData["subject"] as string | undefined);

  const title = titleFromForm?.trim()
    ? String(titleFromForm).slice(0, 255)
    : "Intake Submission";

  const description = formData["description"] as string | undefined;

  // Fetch routing rules and detect team
  const rules = await db.routingRule.findMany({ where: { isActive: true } });
  const team = detectTeam(title, description ?? "", rules, formData);

  // Enrich formData with submitter info if provided
  const enrichedFormData: Record<string, unknown> = { ...formData };
  if (submitterName) enrichedFormData["_submitterName"] = submitterName;
  if (submitterEmail) enrichedFormData["_submitterEmail"] = submitterEmail;

  try {
    const ticket = await db.ticket.create({
      data: {
        title,
        description,
        team,
        status: TicketStatus.BACKLOG,
        formData: JSON.stringify(enrichedFormData),
        templateId: templateId ?? null,
        creatorId: adminUser.id,
        priority: 0,
      },
      select: {
        id: true,
        team: true,
      },
    });

    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
