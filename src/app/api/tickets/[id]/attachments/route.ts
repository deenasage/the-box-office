// SPEC: brief-to-epic-workflow.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { storageWrite, UPLOADS_ROOT } from "@/lib/storage";
import { join, extname, basename } from "path";

// Validate that a path segment is a safe CUID (alphanumeric only) before using
// it as a filesystem directory name — prevents path traversal via the URL id.
const SAFE_ID_RE = /^[a-z0-9]+$/i;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_FILES = 10;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Reject IDs containing path separators or unusual characters before they
  // reach the filesystem via join("tickets", id, storedName).
  if (!SAFE_ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
  }

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: { _count: { select: { attachments: true } } },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (ticket._count.attachments >= MAX_FILES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES} files per ticket.` },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `File type not allowed: ${file.type}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 25 MB limit." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Sanitize filename: strip path components, replace unsafe chars
  const sanitizedName = basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = extname(sanitizedName);
  const base = sanitizedName.slice(0, sanitizedName.length - ext.length);
  const storedName = `${base}-${Date.now()}${ext}`;
  const relPath = join("tickets", id, storedName);
  await storageWrite(relPath, buffer);
  const storedPath = join(UPLOADS_ROOT, relPath);

  const attachment = await db.ticketAttachment.create({
    data: {
      ticketId: id,
      uploadedById: session.user.id,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storedPath,
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    {
      data: {
        id: attachment.id,
        ticketId: attachment.ticketId,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        uploadedBy: attachment.uploadedBy,
        createdAt: attachment.createdAt,
      },
    },
    { status: 201 }
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachments = await db.ticketAttachment.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      ticketId: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: attachments });
}
