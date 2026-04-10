// SPEC: form-builder.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    const template = await db.formTemplate.findUnique({
      where: { id },
      include: { fields: { orderBy: { order: "asc" } } },
    });

    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    // When activating, deactivate all others atomically
    if (parsed.data.isActive === true) {
      const template = await db.$transaction(async (tx) => {
        await tx.formTemplate.updateMany({ where: { id: { not: id } }, data: { isActive: false } });
        return tx.formTemplate.update({
          where: { id },
          data: parsed.data,
          include: { fields: { orderBy: { order: "asc" } } },
        });
      });
      return NextResponse.json(template);
    }

    const template = await db.formTemplate.update({
      where: { id },
      data: parsed.data,
      include: { fields: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const ticketCount = await db.ticket.count({ where: { templateId: id } });
    if (ticketCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a template that has tickets submitted against it." },
        { status: 409 }
      );
    }

    await db.formTemplate.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
