// SPEC: ai-brief.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { BriefStatus, UserRole } from "@prisma/client";
import { extractText } from "@/lib/ai/text-extractor";
import { storageWrite, UPLOADS_ROOT } from "@/lib/storage";
import { join, extname, basename } from "path";

const ALLOWED_TYPES = new Set([
  "text/plain",
  "text/html",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "message/rfc822",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const brief = await db.brief.findUnique({
    where: { id },
    include: { _count: { select: { attachments: true } } },
  });
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canMutate(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (
    brief.status === BriefStatus.APPROVED ||
    brief.status === BriefStatus.FINALIZED ||
    brief.status === BriefStatus.ARCHIVED
  ) {
    return NextResponse.json({ error: "Cannot add attachments in current state." }, { status: 400 });
  }
  if (brief._count.attachments >= MAX_FILES) {
    return NextResponse.json({ error: `Maximum ${MAX_FILES} files per brief.` }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 10 MB limit." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Sanitize filename: use basename to strip any path components, then replace unsafe chars
  const sanitizedName = basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
  // Store with timestamp suffix to prevent collisions
  const ext = extname(sanitizedName);
  const base = sanitizedName.slice(0, sanitizedName.length - ext.length);
  const storedName = `${base}-${Date.now()}${ext}`;
  const relPath = join("briefs", id, storedName);
  await storageWrite(relPath, buffer);
  const storedPath = join(UPLOADS_ROOT, relPath);

  // Extract text and append to brief.extractedText
  let extractedChunk = "";
  let truncated = false;
  try {
    const result = await extractText(buffer, file.type);
    extractedChunk = result.text;
    truncated = result.truncated;
  } catch {
    // Extraction failure is non-fatal — brief will note it
  }

  const existing = brief.extractedText ?? "";
  const combined = existing + (existing ? "\n\n---\n\n" : "") + extractedChunk;
  const MAX_CHARS = 50_000;
  const finalText = combined.length > MAX_CHARS ? combined.slice(0, MAX_CHARS) : combined;

  // Update rawInput to flag truncation if needed
  let rawInput = JSON.parse(brief.rawInput) as Record<string, unknown>;
  if (truncated || combined.length > MAX_CHARS) {
    rawInput = { ...rawInput, truncated: true };
  }

  await db.brief.update({
    where: { id },
    data: {
      extractedText: finalText,
      rawInput: JSON.stringify(rawInput),
    },
  });

  const attachment = await db.briefAttachment.create({
    data: {
      briefId: id,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storedPath,
    },
  });

  // Return record without storedPath
  return NextResponse.json(
    {
      id: attachment.id,
      briefId: attachment.briefId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt,
    },
    { status: 201 }
  );
}
