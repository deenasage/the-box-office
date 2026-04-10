// SPEC: brief-to-epic-workflow.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { storageDelete, storageReadAbsolute, UPLOADS_ROOT } from "@/lib/storage";
import { UserRole } from "@prisma/client";
import path from "path";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, attachmentId } = await params;

  const attachment = await db.ticketAttachment.findUnique({
    where: { id: attachmentId },
    select: { id: true, ticketId: true, storedPath: true, uploadedById: true },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attachment.ticketId !== id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCreator = attachment.uploadedById === session.user.id;
  const isAdmin = session.user.role === UserRole.ADMIN;
  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await storageDelete(attachment.storedPath);
  await db.ticketAttachment.delete({ where: { id: attachmentId } });

  return new NextResponse(null, { status: 204 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id, attachmentId } = await params;

  const attachment = await db.ticketAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      ticketId: true,
      storedPath: true,
      fileName: true,
      mimeType: true,
    },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attachment.ticketId !== id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Guard against path traversal: stored path must be inside UPLOADS_ROOT
  const resolved = path.resolve(attachment.storedPath);
  if (!resolved.startsWith(path.resolve(UPLOADS_ROOT))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await storageReadAbsolute(attachment.storedPath);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
