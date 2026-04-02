// SPEC: tickets.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { detectTeam } from "@/lib/routing";
import { evaluateConditions } from "@/lib/form-logic";
import { Team, TicketSize, TicketStatus, Hub, Prisma } from "@prisma/client";
import type { ConditionalRule, FormFieldConfig } from "@/types";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  formData: z.record(z.string(), z.unknown()).optional(),
  templateId: z.string().optional(),
  team: z.nativeEnum(Team).optional(),
  hub: z.nativeEnum(Hub).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  // Optional fields for quick-create flow
  assigneeId: z.string().optional(),
  size: z.nativeEnum(TicketSize).optional(),
  sprintId: z.string().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;

  // Non-admin, non-team-lead users default to seeing only their own team's tickets
  // unless an explicit ?team= param is provided.
  const isPrivileged =
    session.user.role === "ADMIN" || session.user.role === "TEAM_LEAD";
  const defaultTeam =
    !isPrivileged && !searchParams.get("team") && session.user.team
      ? (session.user.team as Team)
      : undefined;

  // Validate enum query params
  let team: Team | undefined = defaultTeam;
  const teamParam = searchParams.get("team") || undefined;
  if (teamParam !== undefined) {
    const teamParsed = z.nativeEnum(Team).safeParse(teamParam);
    if (!teamParsed.success) {
      return NextResponse.json({ error: "Invalid team" }, { status: 400 });
    }
    team = teamParsed.data;
  }

  let status: TicketStatus | undefined;
  const statusParam = searchParams.get("status") || undefined;
  if (statusParam !== undefined) {
    const statusParsed = z.nativeEnum(TicketStatus).safeParse(statusParam);
    if (!statusParsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    status = statusParsed.data;
  }

  let hub: Hub | undefined;
  const hubParam = searchParams.get("hub") || undefined;
  if (hubParam !== undefined) {
    const hubParsed = z.nativeEnum(Hub).safeParse(hubParam);
    if (!hubParsed.success) {
      return NextResponse.json({ error: "Invalid hub" }, { status: 400 });
    }
    hub = hubParsed.data;
  }

  const sprintId = searchParams.get("sprintId");
  const assigneeId = searchParams.get("assigneeId");
  const search = searchParams.get("search");

  // Pagination
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const skip = (page - 1) * limit;

  const where = {
    ...(team ? { team } : {}),
    ...(status ? { status } : {}),
    ...(hub ? { hub } : {}),
    ...(sprintId === "null"
      ? { sprintId: null }
      : sprintId
      ? { sprintId }
      : {}),
    ...(assigneeId === "null"
      ? { assigneeId: null }
      : assigneeId
      ? { assigneeId }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  const [tickets, total] = await Promise.all([
    db.ticket.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, team: true, role: true } },
        creator: { select: { id: true, name: true, email: true, team: true, role: true } },
        sprint: { select: { id: true, name: true } },
        epic: { select: { id: true, name: true, color: true } },
        statusHistory: {
          where: { toStatus: "IN_PROGRESS" },
          orderBy: { changedAt: "asc" },
          take: 1,
          select: { changedAt: true },
        },
        aiEstimates: {
          where: { accepted: false },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip,
    }),
    db.ticket.count({ where }),
  ]);

  const data = tickets.map(({ statusHistory, aiEstimates, ...ticket }) => ({
    ...ticket,
    cycleStartedAt: statusHistory[0]?.changedAt ?? null,
    hasPendingEstimate: aiEstimates.length > 0,
  }));

  return NextResponse.json({ data, total, page, limit });
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, templateId, team: manualTeam, hub, priority, assigneeId, size, sprintId, status } = parsed.data;
  let { formData } = parsed.data;

  // Validate assigneeId and sprintId before any further work
  if (assigneeId !== undefined) {
    const assignee = await db.user.findUnique({ where: { id: assigneeId }, select: { id: true } });
    if (!assignee) {
      return NextResponse.json({ error: "assigneeId does not refer to an existing user" }, { status: 400 });
    }
  }

  if (sprintId !== undefined) {
    const sprint = await db.sprint.findUnique({ where: { id: sprintId }, select: { id: true, isActive: true } });
    if (!sprint) {
      return NextResponse.json({ error: "sprintId does not refer to an existing sprint" }, { status: 400 });
    }
    // Closed sprints are sprints that are not active and have an endDate in the past.
    // The schema has no explicit SprintStatus enum, so we check isActive === false
    // combined with endDate < now as the "closed" signal.
    const sprintFull = await db.sprint.findUnique({ where: { id: sprintId }, select: { endDate: true, isActive: true } });
    if (sprintFull && !sprintFull.isActive && sprintFull.endDate < new Date()) {
      return NextResponse.json({ error: "Cannot assign ticket to a closed sprint" }, { status: 400 });
    }
  }

  // Fetch template (for hidden-field stripping) and routing rules in parallel
  const [tmpl, routingRules] = await Promise.all([
    templateId && formData
      ? db.formTemplate.findUnique({
          where: { id: templateId },
          include: { fields: { orderBy: { order: "asc" } } },
        })
      : Promise.resolve(null),
    !manualTeam
      ? db.routingRule.findMany({ where: { isActive: true } })
      : Promise.resolve(null),
  ]);

  // Task 5: strip hidden field values server-side
  if (tmpl && formData) {
    const fieldConfigs: FormFieldConfig[] = tmpl.fields.map((f) => ({
      id: f.id,
      label: f.label,
      fieldKey: f.fieldKey,
      type: f.type,
      required: f.required,
      order: f.order,
      options: f.options ? (JSON.parse(f.options) as string[]) : undefined,
      conditions: f.conditions ? (JSON.parse(f.conditions) as ConditionalRule[]) : undefined,
    }));
    const cleanedData: Record<string, unknown> = {};
    for (const fc of fieldConfigs) {
      const { visible } = evaluateConditions(fc, formData as Record<string, unknown>);
      if (visible) cleanedData[fc.fieldKey] = formData[fc.fieldKey];
    }
    formData = cleanedData;
  }

  // Auto-detect team from routing rules unless manually specified
  let resolvedTeam = manualTeam;
  if (!resolvedTeam) {
    resolvedTeam = detectTeam(title, description ?? "", routingRules ?? [], formData ?? undefined);
  }

  try {
    const ticket = await db.ticket.create({
      data: {
        title,
        description,
        team: resolvedTeam,
        formData: JSON.stringify(formData ?? {}),
        templateId,
        priority: priority ?? 0,
        creatorId: session.user.id,
        ...(hub !== undefined ? { hub } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
        ...(size !== undefined ? { size } : {}),
        ...(sprintId !== undefined ? { sprintId } : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, team: true, role: true } },
        creator: { select: { id: true, name: true, email: true, team: true, role: true } },
        sprint: { select: { id: true, name: true } },
        epic: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Ticket already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
