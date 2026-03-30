// SPEC: project-document.md
// GET  /api/portfolio/[epicId]/document — fetch or create-empty the ProjectDocument for an epic. Requires auth.
// PUT  /api/portfolio/[epicId]/document — save all tab data at once (full replace). Requires auth.
// Response: { data: ProjectDocumentData } | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { z } from "zod";
import type { ProjectDocumentData } from "@/types/project-document";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const LinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

const OverviewSchema = z.object({
  projectName: z.string(),
  workfrontId: z.string(),
  startDate: z.string().nullable(),
  deliveryDate: z.string().nullable(),
  projectSummary: z.string(),
  agreedUponScope: z.string(),
  expectedBenefits: z.string(),
  links: z.array(LinkSchema),
});

const DeliveryPlanRowSchema = z.object({
  id: z.string(),
  region: z.string(),
  pageExistsInMarket: z.boolean(),
  pageName: z.string(),
  currentUrl: z.string(),
  mappedUrl: z.string(),
  pageTemplate: z.string(),
  buildSpecGaps: z.string(),
  notes: z.string(),
  localisationRequired: z.boolean(),
  localisationStatus: z.string(),
  seoStatus: z.string(),
  seoRecommendationsLink: z.string(),
  contentStatus: z.string(),
  copywriterLink: z.string(),
  xdStatus: z.string(),
  figmaLink: z.string(),
  assets: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  blogTag: z.string(),
  taxonomyTag: z.string(),
  stagingLink: z.string(),
  proofHqLink: z.string(),
  wemQaAccessibilityCheck: z.boolean(),
  status: z.string(),
  live: z.boolean(),
  goLiveDate: z.string().nullable(),
  goLiveWebChat: z.string(),
  deliveryNotes: z.string(),
});

const WeeklySlotSchema = z.object({
  weekStart: z.string(),
  monday: z.boolean(),
  tuesday: z.boolean(),
  wednesday: z.boolean(),
  thursday: z.boolean(),
  friday: z.boolean(),
});

const DeliveryTimelineRowSchema = z.object({
  id: z.string(),
  stage: z.string(),
  owner: z.string(),
  ownerTeam: z
    .enum(["CONTENT", "DESIGN", "SEO", "WEM", "PAID_MEDIA", "ANALYTICS"])
    .nullable(),
  task: z.string(),
  status: z.string(),
  notes: z.string(),
  weeklySlots: z.array(WeeklySlotSchema),
});

const RACIRowSchema = z.object({
  id: z.string(),
  workstream: z.string(),
  responsible: z.string(),
  accountable: z.string(),
  consulted: z.string(),
  informed: z.string(),
});

const RAIDRowSchema = z.object({
  id: z.number(),
  type: z.enum(["RISK", "ASSUMPTION", "ISSUE", "DEPENDENCY"]),
  description: z.string(),
  notes: z.string(),
  nextSteps: z.string(),
  owner: z.string(),
  updateDue: z.string().nullable(),
  dateLastUpdated: z.string().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "RESOLVED"]),
});

const GapsTrackerRowSchema = z.object({
  id: z.string(),
  page: z.string(),
  gapAmend: z.string(),
  owner: z.string(),
  gapStatus: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "WONT_FIX"]),
  resolution: z.string(),
  notes: z.string(),
});

const HypercareRowSchema = z.object({
  id: z.string(),
  pageLink: z.string(),
  gapAmend: z.string(),
  raisedBy: z.string(),
  comOrCart: z.string(),
  notes: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  reqId: z.string(),
  complete: z.boolean(),
});

const RiskRegisterRowSchema = z.object({
  id: z.number(),
  riskDescription: z.string(),
  riskCategory: z.string(),
  probability: z.enum(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]),
  impact: z.enum(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]),
  riskOwner: z.string(),
  mitigationPlan: z.string(),
  contingencyPlan: z.string(),
  status: z.enum(["OPEN", "MITIGATED", "ACCEPTED", "CLOSED"]),
});

const IssueLogRowSchema = z.object({
  id: z.number(),
  issueDescription: z.string(),
  issueCategory: z.string(),
  issueOwner: z.string(),
  actionsTaken: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

const GoLiveCommsRowSchema = z.object({
  id: z.string(),
  emailGroupName: z.string(),
  distributionList: z.string(),
  notes: z.string(),
});

const PutBodySchema = z.object({
  overview: OverviewSchema.optional(),
  deliveryPlan: z.array(DeliveryPlanRowSchema).optional(),
  deliveryTimeline: z.array(DeliveryTimelineRowSchema).optional(),
  raci: z.array(RACIRowSchema).optional(),
  raid: z.array(RAIDRowSchema).optional(),
  gapsTracker: z.array(GapsTrackerRowSchema).optional(),
  hypercare: z.array(HypercareRowSchema).optional(),
  riskRegister: z.array(RiskRegisterRowSchema).optional(),
  issueLog: z.array(IssueLogRowSchema).optional(),
  goLiveComms: z.array(GoLiveCommsRowSchema).optional(),
});

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

type DbDoc = {
  id: string;
  epicId: string;
  overview: string | null;
  deliveryPlan: string | null;
  deliveryTimeline: string | null;
  raci: string | null;
  raid: string | null;
  gapsTracker: string | null;
  hypercare: string | null;
  riskRegister: string | null;
  issueLog: string | null;
  goLiveComms: string | null;
  aiPrefilled: boolean;
  aiPrefilledAt: Date | null;
  updatedAt: Date;
};

function formatDocument(doc: DbDoc): ProjectDocumentData {
  return {
    id: doc.id,
    epicId: doc.epicId,
    overview: parseTab(doc.overview),
    deliveryPlan: parseTabArray(doc.deliveryPlan),
    deliveryTimeline: parseTabArray(doc.deliveryTimeline),
    raci: parseTabArray(doc.raci),
    raid: parseTabArray(doc.raid),
    gapsTracker: parseTabArray(doc.gapsTracker),
    hypercare: parseTabArray(doc.hypercare),
    riskRegister: parseTabArray(doc.riskRegister),
    issueLog: parseTabArray(doc.issueLog),
    goLiveComms: parseTabArray(doc.goLiveComms),
    aiPrefilled: doc.aiPrefilled,
    aiPrefilledAt: doc.aiPrefilledAt ? doc.aiPrefilledAt.toISOString() : null,
    updatedAt: doc.updatedAt.toISOString(),
  };
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
    select: { id: true },
  });
  if (!epic) return NextResponse.json({ error: "Epic not found" }, { status: 404 });

  // Upsert: return existing doc or create an empty one
  let doc = await db.projectDocument.findUnique({ where: { epicId } });
  if (!doc) {
    doc = await db.projectDocument.create({ data: { epicId } });
  }

  return NextResponse.json({ data: formatDocument(doc) });
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ epicId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { epicId } = await params;

  const epic = await db.epic.findUnique({
    where: { id: epicId },
    select: { id: true },
  });
  if (!epic) return NextResponse.json({ error: "Epic not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = PutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    overview,
    deliveryPlan,
    deliveryTimeline,
    raci,
    raid,
    gapsTracker,
    hypercare,
    riskRegister,
    issueLog,
    goLiveComms,
  } = parsed.data;

  // Build update payload — only overwrite fields that were provided
  const updateData: Record<string, string | undefined> = {};
  if (overview !== undefined) updateData.overview = JSON.stringify(overview);
  if (deliveryPlan !== undefined) updateData.deliveryPlan = JSON.stringify(deliveryPlan);
  if (deliveryTimeline !== undefined) updateData.deliveryTimeline = JSON.stringify(deliveryTimeline);
  if (raci !== undefined) updateData.raci = JSON.stringify(raci);
  if (raid !== undefined) updateData.raid = JSON.stringify(raid);
  if (gapsTracker !== undefined) updateData.gapsTracker = JSON.stringify(gapsTracker);
  if (hypercare !== undefined) updateData.hypercare = JSON.stringify(hypercare);
  if (riskRegister !== undefined) updateData.riskRegister = JSON.stringify(riskRegister);
  if (issueLog !== undefined) updateData.issueLog = JSON.stringify(issueLog);
  if (goLiveComms !== undefined) updateData.goLiveComms = JSON.stringify(goLiveComms);

  try {
    const doc = await db.projectDocument.upsert({
      where: { epicId },
      create: { epicId, ...updateData },
      update: updateData,
    });
    return NextResponse.json({ data: formatDocument(doc) });
  } catch {
    return apiError("Failed to save document", 500);
  }
}
