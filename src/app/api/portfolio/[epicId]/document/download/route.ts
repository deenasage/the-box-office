// SPEC: project-document.md
// GET /api/portfolio/[epicId]/document/download — generate and stream an .xlsx file.
// Reads the current ProjectDocument and builds one sheet per tab.
// Returns with Content-Disposition: attachment; filename="project-document-<epic-name>.xlsx"
// Auth required.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";
import type {
  ProjectOverviewData,
  DeliveryPlanRow,
  DeliveryTimelineRow,
  RACIRow,
  RAIDRow,
  GapsTrackerRow,
  HypercareRow,
  RiskRegisterRow,
  IssueLogRow,
  GoLiveCommsRow,
} from "@/types/project-document";

export const dynamic = "force-dynamic";

// ── Style constants ───────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E40AF" }, // #1e40af — blue-800
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTab<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parseTabArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, colCount: number): void {
  const headerRow = sheet.getRow(1);
  for (let c = 1; c <= colCount; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "left" };
  }
  headerRow.commit();
}

function autoWidth(sheet: ExcelJS.Worksheet): void {
  sheet.columns.forEach((col: Partial<ExcelJS.Column>) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell: ExcelJS.Cell) => {
      const val = cell.value;
      const str = val === null || val === undefined ? "" : String(val);
      if (str.length > maxLen) maxLen = str.length;
    });
    col.width = Math.min(maxLen + 4, 60);
  });
}

// ── Sheet builders ────────────────────────────────────────────────────────────

function buildOverviewSheet(
  wb: ExcelJS.Workbook,
  data: ProjectOverviewData | null
): void {
  const sheet = wb.addWorksheet("Overview");
  sheet.columns = [
    { header: "projectName", key: "projectName" },
    { header: "workfrontId", key: "workfrontId" },
    { header: "startDate", key: "startDate" },
    { header: "deliveryDate", key: "deliveryDate" },
    { header: "projectSummary", key: "projectSummary" },
    { header: "agreedUponScope", key: "agreedUponScope" },
    { header: "expectedBenefits", key: "expectedBenefits" },
    { header: "links", key: "links" },
  ];
  styleHeaderRow(sheet, 8);
  if (data) {
    sheet.addRow({
      projectName: data.projectName,
      workfrontId: data.workfrontId,
      startDate: data.startDate ?? "",
      deliveryDate: data.deliveryDate ?? "",
      projectSummary: data.projectSummary,
      agreedUponScope: data.agreedUponScope,
      expectedBenefits: data.expectedBenefits,
      links: data.links.map((l) => `${l.label}: ${l.url}`).join(" | "),
    });
  }
  autoWidth(sheet);
}

function buildDeliveryPlanSheet(
  wb: ExcelJS.Workbook,
  rows: DeliveryPlanRow[]
): void {
  const sheet = wb.addWorksheet("Delivery Plan");
  sheet.columns = [
    { header: "id", key: "id" },
    { header: "region", key: "region" },
    { header: "pageExistsInMarket", key: "pageExistsInMarket" },
    { header: "pageName", key: "pageName" },
    { header: "currentUrl", key: "currentUrl" },
    { header: "mappedUrl", key: "mappedUrl" },
    { header: "pageTemplate", key: "pageTemplate" },
    { header: "buildSpecGaps", key: "buildSpecGaps" },
    { header: "notes", key: "notes" },
    { header: "localisationRequired", key: "localisationRequired" },
    { header: "localisationStatus", key: "localisationStatus" },
    { header: "seoStatus", key: "seoStatus" },
    { header: "seoRecommendationsLink", key: "seoRecommendationsLink" },
    { header: "contentStatus", key: "contentStatus" },
    { header: "copywriterLink", key: "copywriterLink" },
    { header: "xdStatus", key: "xdStatus" },
    { header: "figmaLink", key: "figmaLink" },
    { header: "assets", key: "assets" },
    { header: "metaTitle", key: "metaTitle" },
    { header: "metaDescription", key: "metaDescription" },
    { header: "blogTag", key: "blogTag" },
    { header: "taxonomyTag", key: "taxonomyTag" },
    { header: "stagingLink", key: "stagingLink" },
    { header: "proofHqLink", key: "proofHqLink" },
    { header: "wemQaAccessibilityCheck", key: "wemQaAccessibilityCheck" },
    { header: "status", key: "status" },
    { header: "live", key: "live" },
    { header: "goLiveDate", key: "goLiveDate" },
    { header: "goLiveWebChat", key: "goLiveWebChat" },
    { header: "deliveryNotes", key: "deliveryNotes" },
  ];
  styleHeaderRow(sheet, sheet.columns.length);
  for (const row of rows) {
    sheet.addRow({ ...row, goLiveDate: row.goLiveDate ?? "" });
  }
  autoWidth(sheet);
}

function buildDeliveryTimelineSheet(
  wb: ExcelJS.Workbook,
  rows: DeliveryTimelineRow[]
): void {
  const sheet = wb.addWorksheet("Delivery Timeline");
  sheet.columns = [
    { header: "id", key: "id" },
    { header: "stage", key: "stage" },
    { header: "owner", key: "owner" },
    { header: "ownerTeam", key: "ownerTeam" },
    { header: "task", key: "task" },
    { header: "status", key: "status" },
    { header: "notes", key: "notes" },
    { header: "weeklySlots", key: "weeklySlots" },
  ];
  styleHeaderRow(sheet, 8);
  for (const row of rows) {
    sheet.addRow({
      id: row.id,
      stage: row.stage,
      owner: row.owner,
      ownerTeam: row.ownerTeam ?? "",
      task: row.task,
      status: row.status,
      notes: row.notes,
      weeklySlots: JSON.stringify(row.weeklySlots),
    });
  }
  autoWidth(sheet);
}

function buildRACISheet(wb: ExcelJS.Workbook, rows: RACIRow[]): void {
  const sheet = wb.addWorksheet("RACI");
  sheet.columns = [
    { header: "id", key: "id" },
    { header: "workstream", key: "workstream" },
    { header: "responsible", key: "responsible" },
    { header: "accountable", key: "accountable" },
    { header: "consulted", key: "consulted" },
    { header: "informed", key: "informed" },
  ];
  styleHeaderRow(sheet, 6);
  for (const row of rows) sheet.addRow(row);
  autoWidth(sheet);
}

function buildRAIDSheet(wb: ExcelJS.Workbook, rows: RAIDRow[]): void {
  const sheet = wb.addWorksheet("RAID");
  sheet.columns = [
    { header: "id", key: "id" },
    { header: "type", key: "type" },
    { header: "description", key: "description" },
    { header: "notes", key: "notes" },
    { header: "nextSteps", key: "nextSteps" },
    { header: "owner", key: "owner" },
    { header: "updateDue", key: "updateDue" },
    { header: "dateLastUpdated", key: "dateLastUpdated" },
    { header: "status", key: "status" },
  ];
  styleHeaderRow(sheet, 9);
  for (const row of rows) {
    sheet.addRow({
      ...row,
      updateDue: row.updateDue ?? "",
      dateLastUpdated: row.dateLastUpdated ?? "",
    });
  }
  autoWidth(sheet);
}

function buildGapsTrackerSheet(
  wb: ExcelJS.Workbook,
  rows: GapsTrackerRow[]
): void {
  const sheet = wb.addWorksheet("Gaps Tracker");
  sheet.columns = [
    { header: "id", key: "id" },
    { header: "page", key: "page" },
    { header: "gapAmend", key: "gapAmend" },
    { header: "owner", key: "owner" },
    { header: "gapStatus", key: "gapStatus" },
    { header: "resolution", key: "resolution" },
    { header: "notes", key: "notes" },
  ];
  styleHeaderRow(sheet, 7);
  for (const row of rows) sheet.addRow(row);
  autoWidth(sheet);
}

function buildHypercareSheet(
  wb: ExcelJS.Workbook,
  rows: HypercareRow[]
): void {
  const sheet = wb.addWorksheet("Hypercare");
  sheet.columns = [
    { header: "id", key: "id" },
    { header: "pageLink", key: "pageLink" },
    { header: "gapAmend", key: "gapAmend" },
    { header: "raisedBy", key: "raisedBy" },
    { header: "comOrCart", key: "comOrCart" },
    { header: "notes", key: "notes" },
    { header: "priority", key: "priority" },
    { header: "reqId", key: "reqId" },
    { header: "complete", key: "complete" },
  ];
  styleHeaderRow(sheet, 9);
  for (const row of rows) sheet.addRow(row);
  autoWidth(sheet);
}

function buildRiskRegisterSheet(
  wb: ExcelJS.Workbook,
  rows: RiskRegisterRow[]
): void {
  const sheet = wb.addWorksheet("Risk Register");
  sheet.columns = [
    { header: "id", key: "id" },
    { header: "riskDescription", key: "riskDescription" },
    { header: "riskCategory", key: "riskCategory" },
    { header: "probability", key: "probability" },
    { header: "impact", key: "impact" },
    { header: "riskOwner", key: "riskOwner" },
    { header: "mitigationPlan", key: "mitigationPlan" },
    { header: "contingencyPlan", key: "contingencyPlan" },
    { header: "status", key: "status" },
  ];
  styleHeaderRow(sheet, 9);
  for (const row of rows) sheet.addRow(row);
  autoWidth(sheet);
}

function buildIssueLogSheet(wb: ExcelJS.Workbook, rows: IssueLogRow[]): void {
  const sheet = wb.addWorksheet("Issue Log");
  sheet.columns = [
    { header: "id", key: "id" },
    { header: "issueDescription", key: "issueDescription" },
    { header: "issueCategory", key: "issueCategory" },
    { header: "issueOwner", key: "issueOwner" },
    { header: "actionsTaken", key: "actionsTaken" },
    { header: "status", key: "status" },
  ];
  styleHeaderRow(sheet, 6);
  for (const row of rows) sheet.addRow(row);
  autoWidth(sheet);
}

function buildGoLiveCommsSheet(
  wb: ExcelJS.Workbook,
  rows: GoLiveCommsRow[]
): void {
  const sheet = wb.addWorksheet("Go-Live Comms");
  sheet.columns = [
    { header: "id", key: "id" },
    { header: "emailGroupName", key: "emailGroupName" },
    { header: "distributionList", key: "distributionList" },
    { header: "notes", key: "notes" },
  ];
  styleHeaderRow(sheet, 4);
  for (const row of rows) sheet.addRow(row);
  autoWidth(sheet);
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ epicId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { epicId } = await params;

  const epic = await db.epic.findUnique({
    where: { id: epicId },
    select: { id: true, name: true },
  });
  if (!epic) return NextResponse.json({ error: "Epic not found" }, { status: 404 });

  const doc = await db.projectDocument.findUnique({ where: { epicId } });
  if (!doc) {
    return NextResponse.json({ error: "Document not found — fetch GET /document first to initialise" }, { status: 404 });
  }

  // Build workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ticket Intake";
  wb.created = new Date();

  buildOverviewSheet(wb, parseTab<ProjectOverviewData>(doc.overview));
  buildDeliveryPlanSheet(wb, parseTabArray<DeliveryPlanRow>(doc.deliveryPlan));
  buildDeliveryTimelineSheet(
    wb,
    parseTabArray<DeliveryTimelineRow>(doc.deliveryTimeline)
  );
  buildRACISheet(wb, parseTabArray<RACIRow>(doc.raci));
  buildRAIDSheet(wb, parseTabArray<RAIDRow>(doc.raid));
  buildGapsTrackerSheet(wb, parseTabArray<GapsTrackerRow>(doc.gapsTracker));
  buildHypercareSheet(wb, parseTabArray<HypercareRow>(doc.hypercare));
  buildRiskRegisterSheet(wb, parseTabArray<RiskRegisterRow>(doc.riskRegister));
  buildIssueLogSheet(wb, parseTabArray<IssueLogRow>(doc.issueLog));
  buildGoLiveCommsSheet(wb, parseTabArray<GoLiveCommsRow>(doc.goLiveComms));

  // Serialise to buffer
  let buffer: ArrayBuffer;
  try {
    buffer = await wb.xlsx.writeBuffer();
  } catch (err) {
    console.error("[download] ExcelJS write failed:", err);
    return apiError("Failed to generate Excel file", 500);
  }

  // Safe filename: strip non-ASCII and spaces
  const safeName = epic.name
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .toLowerCase();

  const filename = `project-document-${safeName}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
