// SPEC: ai-brief.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { storageDelete, storageReadAbsolute, UPLOADS_ROOT } from "@/lib/storage";
import path from "path";

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, attachmentId } = await params;
  const attachment = await db.briefAttachment.findUnique({
    where: { id: attachmentId },
    include: { brief: { select: { creatorId: true } } },
  });
  if (!attachment || attachment.briefId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canMutate(session, attachment.brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await storageDelete(attachment.storedPath);
  } catch {
    // File may already be gone — continue
  }

  await db.briefAttachment.delete({ where: { id: attachmentId } });
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id, attachmentId } = await params;
  const attachment = await db.briefAttachment.findUnique({
    where: { id: attachmentId },
    include: { brief: { select: { creatorId: true } } },
  });
  if (!attachment || attachment.briefId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin =
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.TEAM_LEAD;
  if (!isAdmin && attachment.brief.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Guard against path traversal — storedPath must be under the uploads root
  if (!attachment.storedPath.startsWith(UPLOADS_ROOT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await storageReadAbsolute(attachment.storedPath);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${attachment.fileName}"`,
    },
  });
}
