// SPEC: tickets.md
// POST /api/tickets/bulk
// Body: { ids: string[], patch: { status?, assigneeId?, sprintId?, epicId? } }
// Updates up to 100 tickets in a single operation. Requires auth.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { TicketStatus } from "@prisma/client";

const bulkPatchSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  patch: z
    .object({
      status: z.nativeEnum(TicketStatus).optional(),
      assigneeId: z.string().nullable().optional(),
      sprintId: z.string().nullable().optional(),
      epicId: z.string().nullable().optional(),
    })
    .refine(
      (p) =>
        p.status !== undefined ||
        p.assigneeId !== undefined ||
        p.sprintId !== undefined ||
        p.epicId !== undefined,
      { message: "patch must include at least one field to update" }
    ),
});

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bulkPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ids, patch } = parsed.data;

  // Build the data object carefully — only include keys that were explicitly provided
  // so that passing assigneeId: null correctly clears the field
  const data: {
    status?: TicketStatus;
    assigneeId?: string | null;
    sprintId?: string | null;
    epicId?: string | null;
  } = {};

  if (patch.status !== undefined) data.status = patch.status;
  if (patch.assigneeId !== undefined) data.assigneeId = patch.assigneeId;
  if (patch.sprintId !== undefined) data.sprintId = patch.sprintId;
  if (patch.epicId !== undefined) data.epicId = patch.epicId;

  try {
    const result = await db.ticket.updateMany({
      where: { id: { in: ids } },
      data,
    });
    return NextResponse.json({ updated: result.count });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
