// SPEC: jira-import.md
// POST /api/import/jira — ADMIN or TEAM_LEAD only.
// Accepts multipart/form-data with a single field named "file" (.csv or .xml).
//
// Without ?preview=true:
//   Returns { data: { imported: number; skipped: number; errors: string[] } }
//
// With ?preview=true:
//   Parses file + runs duplicate check but writes NOTHING to the DB.
//   Returns { data: { rows: PreviewRow[]; totalRows: number; duplicates: number; willImport: number } }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isTeamLead } from "@/lib/api-helpers";
import { detectTeam } from "@/lib/routing";
import { Team, TicketStatus, TicketSize, UserRole } from "@prisma/client";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Priority mapping ─────────────────────────────────────────────────────────

function mapPriority(raw: string | undefined): number {
  if (!raw) return 0;
  const v = raw.trim().toLowerCase();
  if (v === "highest" || v === "critical") return 3;
  if (v === "high") return 2;
  if (v === "medium") return 1;
  return 0; // Low, Lowest, or anything else
}

function priorityLabel(p: number): string {
  if (p === 3) return "High";
  if (p === 2) return "Medium";
  if (p === 1) return "Low";
  return "None";
}

// ── Status mapping ───────────────────────────────────────────────────────────

function mapStatus(raw: string | undefined): TicketStatus {
  if (!raw) return TicketStatus.BACKLOG;
  const v = raw.trim().toLowerCase();
  if (v === "done" || v === "closed" || v === "resolved") return TicketStatus.DONE;
  if (v === "in progress" || v === "in development") return TicketStatus.IN_PROGRESS;
  if (v === "in review" || v === "under review") return TicketStatus.IN_REVIEW;
  if (v === "blocked" || v === "impediment") return TicketStatus.BLOCKED;
  return TicketStatus.BACKLOG;
}

// ── Size mapping ─────────────────────────────────────────────────────────────

function mapSize(raw: string | undefined): TicketSize | null {
  if (!raw) return null;
  const n = parseFloat(raw.trim());
  if (isNaN(n)) return null;
  if (n <= 1) return TicketSize.XS;
  if (n <= 2) return TicketSize.S;
  if (n <= 5) return TicketSize.M;
  if (n <= 8) return TicketSize.L;
  return TicketSize.XL; // 13+
}

// ── Minimal CSV parser (handles quoted fields and embedded commas/newlines) ──

interface CsvRow {
  [key: string]: string;
}

function parseCsv(text: string): CsvRow[] {
  // Normalise line endings
  const normalised = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Tokenise: walk character by character
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < normalised.length) {
    const ch = normalised[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek at next char
        if (normalised[i + 1] === '"') {
          // Escaped quote inside quoted field
          field += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ",") {
      currentRow.push(field);
      field = "";
      i++;
      continue;
    }

    if (ch === "\n") {
      currentRow.push(field);
      field = "";
      rows.push(currentRow);
      currentRow = [];
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Flush the last field / row
  if (field || currentRow.length > 0) {
    currentRow.push(field);
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];

  // First row = headers (normalise to lower-case trimmed)
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  return rows.slice(1).map((cols) => {
    const obj: CsvRow = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? "").trim();
    });
    return obj;
  });
}

// ── Normalised intermediate row (internal use) ────────────────────────────────

interface ParsedRow {
  title: string;
  description: string;
  priority: number;
  status: TicketStatus;
  size: TicketSize | null;
  assigneeName: string;
  labelNames: string[];
}

// ── Preview row (returned to client in preview mode) ─────────────────────────

export interface PreviewRow {
  title: string;
  team: Team;
  status: TicketStatus;
  priority: string;
  assignee: string;
  size: string;
  labelCount: number;
  isDuplicate: boolean;
}

function csvRowToIntermediate(row: CsvRow): ParsedRow | null {
  // Case-insensitive header lookup helper
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const val = row[k.toLowerCase()];
      if (val !== undefined && val !== "") return val;
    }
    return "";
  };

  const title = get("Summary", "summary", "Title", "title");
  if (!title) return null;

  const rawDescription = get("Description", "description");
  const epicLink = get("Epic Link", "epic link", "Epic Name", "epic name");
  const issueKey = get("Issue key", "issue key", "Key", "key");

  // Fold epic info into description if present
  let description = rawDescription;
  if (epicLink) description = `[Epic: ${epicLink}]\n\n${description}`.trim();
  if (issueKey) description = `[Jira: ${issueKey}] ${description}`.trim();

  const priority = mapPriority(get("Priority", "priority"));
  const status = mapStatus(get("Status", "status"));

  const storyPointsRaw = get(
    "Story Points",
    "story points",
    "Story point estimate",
    "story point estimate",
    "Story Points (sum)",
  );
  const size = mapSize(storyPointsRaw);

  const assigneeName = get("Assignee", "assignee");

  const labelsRaw = get("Labels", "labels");
  const labelNames = labelsRaw
    ? labelsRaw
        .split(/[,;|]/)
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  return { title, description, priority, status, size, assigneeName, labelNames };
}

// ── XML parser (string-based, no external deps) ───────────────────────────────

function extractXmlText(xml: string, tag: string): string {
  // Match <tag ...>content</tag> — handles CDATA sections
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = re.exec(xml);
  if (!match) return "";
  let content = match[1];
  // Strip CDATA markers
  content = content.replace(/<!\[CDATA\[|\]\]>/g, "");
  return content.trim();
}

function extractXmlCustomField(xml: string, fieldName: string): string {
  // <customfield customfieldname="Story Points"><customfieldvalues><customfieldvalue>5</customfieldvalue>
  const re = new RegExp(
    `<customfield[^>]*customfieldname="${fieldName}"[^>]*>[\\s\\S]*?<customfieldvalue>([\\s\\S]*?)<\\/customfieldvalue>`,
    "i",
  );
  const match = re.exec(xml);
  if (!match) return "";
  return match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function parseXml(text: string): ParsedRow[] {
  // Split into <item> blocks
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  const rows: ParsedRow[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(text)) !== null) {
    const block = match[1];

    const title = extractXmlText(block, "summary");
    if (!title) continue;

    const rawDescription = extractXmlText(block, "description");
    const issueKey = extractXmlText(block, "key");
    let description = rawDescription;
    if (issueKey) description = `[Jira: ${issueKey}] ${description}`.trim();

    const priority = mapPriority(extractXmlText(block, "priority"));
    const status = mapStatus(extractXmlText(block, "status"));

    const storyPointsRaw = extractXmlCustomField(block, "Story Points");
    const size = mapSize(storyPointsRaw);

    const assigneeName = extractXmlText(block, "assignee");

    // <labels><label>foo</label><label>bar</label></labels>
    const labelsBlockRe = /<labels>([\s\S]*?)<\/labels>/i;
    const labelsBlockMatch = labelsBlockRe.exec(block);
    const labelNames: string[] = [];
    if (labelsBlockMatch) {
      const labelRe = /<label>([\s\S]*?)<\/label>/gi;
      let lm: RegExpExecArray | null;
      while ((lm = labelRe.exec(labelsBlockMatch[1])) !== null) {
        const lv = lm[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
        if (lv) labelNames.push(lv);
      }
    }

    rows.push({ title, description, priority, status, size, assigneeName, labelNames });
  }

  return rows;
}

// ── Shared: parse file into intermediate rows ─────────────────────────────────

function parseFile(text: string, filename: string): ParsedRow[] {
  if (filename.endsWith(".csv")) {
    const csvRows = parseCsv(text);
    return csvRows.map(csvRowToIntermediate).filter((r): r is ParsedRow => r !== null);
  }
  return parseXml(text);
}

// ── Shared: load all existing ticket titles into a lowercased Set ─────────────

async function loadExistingTitles(): Promise<Set<string>> {
  const existing = await db.ticket.findMany({ select: { title: true } });
  return new Set(existing.map((t) => t.title.toLowerCase()));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth — ADMIN or TEAM_LEAD only
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session.user.role as UserRole;
  if (role !== UserRole.ADMIN && !isTeamLead(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Check preview mode
  const url = new URL(req.url);
  const isPreview = url.searchParams.get("preview") === "true";

  // 3. Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  if (!fileEntry || typeof fileEntry === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const file = fileEntry as File;

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  }

  const filename = file.name.toLowerCase();
  if (!filename.endsWith(".csv") && !filename.endsWith(".xml")) {
    return NextResponse.json(
      { error: "Unsupported file type — upload a .csv or .xml file" },
      { status: 400 },
    );
  }

  // 4. Read file text
  let text: string;
  try {
    text = await file.text();
  } catch {
    return NextResponse.json({ error: "Failed to read file contents" }, { status: 400 });
  }

  // 5. Parse into intermediate rows
  let intermediateRows: ParsedRow[];
  try {
    intermediateRows = parseFile(text, filename);
  } catch {
    return NextResponse.json({ error: "Failed to parse file" }, { status: 400 });
  }

  if (intermediateRows.length === 0) {
    if (isPreview) {
      return NextResponse.json(
        { data: { rows: [], totalRows: 0, duplicates: 0, willImport: 0 } },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { data: { imported: 0, skipped: 0, errors: ["No valid rows found in file"] } },
      { status: 200 },
    );
  }

  // 6. Preload lookup data to avoid N+1
  let allUsers: { id: string; name: string }[];
  let allLabels: { id: string; name: string }[];
  let routingRules: { keywords: string; team: Team; priority: number }[];
  let existingTitles: Set<string>;

  try {
    [allUsers, allLabels, routingRules, existingTitles] = await Promise.all([
      db.user.findMany({ select: { id: true, name: true } }),
      db.label.findMany({ select: { id: true, name: true } }),
      db.routingRule.findMany({
        where: { isActive: true },
        select: { keywords: true, team: true, priority: true },
        orderBy: { priority: "desc" },
      }),
      loadExistingTitles(),
    ]);
  } catch {
    return NextResponse.json({ error: "Database error loading lookup data" }, { status: 500 });
  }

  // Build lookup maps
  const usersByName = new Map(allUsers.map((u) => [u.name.toLowerCase(), u.id]));
  const labelsByName = new Map(allLabels.map((l) => [l.name.toLowerCase(), l.id]));

  // ── PREVIEW MODE ──────────────────────────────────────────────────────────

  if (isPreview) {
    const previewRows: PreviewRow[] = [];
    let duplicates = 0;

    for (const row of intermediateRows) {
      if (!row.title || row.title.trim() === "") continue;

      const isDuplicate = existingTitles.has(row.title.trim().toLowerCase());
      if (isDuplicate) duplicates++;

      const team = detectTeam(row.title, row.description ?? "", routingRules);

      previewRows.push({
        title: row.title.trim(),
        team,
        status: row.status,
        priority: priorityLabel(row.priority),
        assignee: row.assigneeName || "",
        size: row.size ?? "",
        labelCount: row.labelNames.length,
        isDuplicate,
      });
    }

    return NextResponse.json(
      {
        data: {
          rows: previewRows,
          totalRows: previewRows.length,
          duplicates,
          willImport: previewRows.length - duplicates,
        },
      },
      { status: 200 },
    );
  }

  // ── IMPORT MODE ───────────────────────────────────────────────────────────

  const errors: string[] = [];
  let skipped = 0;

  interface TicketCreateInput {
    title: string;
    description: string | undefined;
    team: Team;
    status: TicketStatus;
    size: TicketSize | null;
    priority: number;
    formData: string;
    creatorId: string;
    assigneeId: string | undefined;
  }

  interface LabelLink {
    ticketIndex: number;
    labelId: string;
  }

  const ticketInputs: TicketCreateInput[] = [];
  const labelLinks: LabelLink[] = [];

  for (let idx = 0; idx < intermediateRows.length; idx++) {
    const row = intermediateRows[idx];

    if (!row.title || row.title.trim() === "") {
      skipped++;
      continue;
    }

    // Duplicate detection — skip tickets whose title already exists (case-insensitive)
    if (existingTitles.has(row.title.trim().toLowerCase())) {
      skipped++;
      continue;
    }

    // Assignee: case-insensitive contains match
    let assigneeId: string | undefined;
    if (row.assigneeName) {
      const nameLower = row.assigneeName.toLowerCase();
      // Try exact match first
      if (usersByName.has(nameLower)) {
        assigneeId = usersByName.get(nameLower);
      } else {
        // Partial contains match
        for (const [uName, uId] of usersByName.entries()) {
          if (uName.includes(nameLower) || nameLower.includes(uName)) {
            assigneeId = uId;
            break;
          }
        }
      }
      if (!assigneeId) {
        errors.push(`Row ${idx + 2}: Assignee "${row.assigneeName}" not found — left unassigned`);
      }
    }

    // Labels: match existing labels by name (case-insensitive)
    const ticketIndex = ticketInputs.length;
    for (const lName of row.labelNames) {
      const lNameLower = lName.toLowerCase();
      const labelId = labelsByName.get(lNameLower);
      if (labelId) {
        labelLinks.push({ ticketIndex, labelId });
      } else {
        errors.push(`Row ${idx + 2}: Label "${lName}" not found — skipped`);
      }
    }

    // Auto-routing
    const team = detectTeam(row.title, row.description ?? "", routingRules);

    ticketInputs.push({
      title: row.title.trim(),
      description: row.description || undefined,
      team,
      status: row.status,
      size: row.size,
      priority: row.priority,
      formData: JSON.stringify({}),
      creatorId: session.user.id,
      assigneeId,
    });
  }

  if (ticketInputs.length === 0) {
    return NextResponse.json(
      { data: { imported: 0, skipped, errors } },
      { status: 200 },
    );
  }

  // 7. Bulk create tickets in batches
  let createdCount = 0;
  try {
    // createMany doesn't return IDs in SQLite with Prisma, so we create in a transaction
    // to get IDs back for label linking. We process in batches to avoid huge transactions.
    const BATCH = 50;

    for (let batchStart = 0; batchStart < ticketInputs.length; batchStart += BATCH) {
      const batch = ticketInputs.slice(batchStart, batchStart + BATCH);

      await db.$transaction(async (tx) => {
        const created = await Promise.all(
          batch.map((input) =>
            tx.ticket.create({
              data: {
                title: input.title,
                description: input.description,
                team: input.team,
                status: input.status,
                size: input.size ?? undefined,
                priority: input.priority,
                formData: input.formData,
                creatorId: input.creatorId,
                assigneeId: input.assigneeId,
              },
              select: { id: true },
            }),
          ),
        );

        // Attach labels
        const labelsForBatch = labelLinks.filter(
          (ll) => ll.ticketIndex >= batchStart && ll.ticketIndex < batchStart + BATCH,
        );

        if (labelsForBatch.length > 0) {
          await tx.ticketLabel.createMany({
            data: labelsForBatch.map((ll) => ({
              ticketId: created[ll.ticketIndex - batchStart].id,
              labelId: ll.labelId,
            })),
          });
        }

        createdCount += created.length;
      });
    }
  } catch (dbErr) {
    console.error("[jira-import] DB error:", dbErr);
    return NextResponse.json(
      { error: "Database error while creating tickets" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      data: {
        imported: createdCount,
        skipped,
        errors,
      },
    },
    { status: 200 },
  );
}
