// SPEC: gtm-brief-generator.md
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Download, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { BriefStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";
import { STATUS_BADGE_STYLES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { GtmBriefSection } from "@/components/briefs/GtmBriefSection";
import { GTM_SECTIONS } from "@/components/briefs/gtm-sections";
import type { Brief, GtmBriefData } from "@/components/briefs/brief-types";

// ── Empty GtmBriefData ────────────────────────────────────────────────────────

function emptyGtmData(): GtmBriefData {
  return {
    AdCreative: null, BackgroundInfo: null, Budget: null, BudgetChanges: null,
    CampaignDetails: null, Changes: null, Competitors: null, Contacts: null,
    Constraints: null, CoreThemes: null, Data: null, DateRange: null,
    Deadline: null, DeadlineReason: null, Deliverables: null, Description: null,
    Drivers: null, EndDate: null, ExpectedOutcomes: null, FinalizedModel: null,
    GTMDeck: null, HighLevelPlanning: null, Impact: null, LiveDate: null,
    LiveDateReason: null, Markets: null, Messaging: null, OtherResources: null,
    PreviousWork: null, ProblemStatement: null, ProductReadyDate: null, SMEs: null,
    SuccessMetrics: null, Title: null, UseCases: null, UserActions: null,
    WhichProduct: null, WhichRegion: null, WhoAreWeTargeting: null, WhyChangesMade: null,
  };
}

function parseGtmData(raw: string | null | undefined): GtmBriefData {
  if (!raw) return emptyGtmData();
  try {
    return { ...emptyGtmData(), ...(JSON.parse(raw) as Partial<GtmBriefData>) };
  } catch {
    return emptyGtmData();
  }
}

// ── Header sub-component ──────────────────────────────────────────────────────

interface GtmHeaderProps {
  brief: Brief;
  onDownload: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

function GtmHeader({ brief, onDownload, onRegenerate, regenerating }: GtmHeaderProps) {
  const displayTitle =
    (brief.briefData ? parseGtmData(brief.briefData).Title : null) ?? brief.title;

  return (
    <div className="space-y-3">
      <Link
        href="/briefs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Briefs
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{displayTitle}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-medium">
              GTM
            </Badge>
            <Badge variant="outline" className={STATUS_BADGE_STYLES[brief.status]}>
              {brief.status.charAt(0) + brief.status.slice(1).toLowerCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {brief.creator.name} &middot; {formatDate(brief.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownload}
            aria-label="Download brief as Word document"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download Brief
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={regenerating || brief.status === BriefStatus.GENERATING}
            aria-label="Regenerate brief from uploaded document"
          >
            {regenerating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Generating state ──────────────────────────────────────────────────────────

const GENERATING_STEPS = [
  "Reading your document…",
  "Identifying key themes and context…",
  "Extracting audience and targeting data…",
  "Pulling messaging and positioning…",
  "Filling in dates, markets, and budget…",
  "Finalising brief fields…",
];

function GeneratingState() {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Animate to ~90% over 55s, leaving room for the real completion
    const total = 55_000;
    const interval = 400;
    const increment = (90 / (total / interval));
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + increment, 90);
        setStepIndex(Math.floor((next / 90) * (GENERATING_STEPS.length - 1)));
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-6 max-w-sm mx-auto">
      <Loader2 className="h-8 w-8 animate-spin text-green-500" aria-hidden="true" />
      <div className="w-full space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{GENERATING_STEPS[stepIndex]}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300 ease-linear"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Claude is reading your document and filling in all brief fields. This takes around 30–60 seconds.</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface GtmBriefDetailProps {
  brief: Brief;
}

export function GtmBriefDetail({ brief: initial }: GtmBriefDetailProps) {
  const router = useRouter();
  const [brief, setBrief] = useState(initial);
  const [gtmData, setGtmData] = useState<GtmBriefData>(() =>
    parseGtmData(initial.briefData)
  );
  const [regenerating, setRegenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll while generating (DRAFT = just created, GENERATING = Claude running)
  const isGenerating =
    brief.status === BriefStatus.GENERATING || brief.status === BriefStatus.DRAFT;

  useEffect(() => {
    if (!isGenerating) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/briefs/${brief.id}`);
      if (!res.ok) return;
      const data = (await res.json()) as Brief;
      setBrief(data);
      setGtmData(parseGtmData(data.briefData));
      if (data.status !== BriefStatus.GENERATING && data.status !== BriefStatus.DRAFT) {
        clearInterval(pollRef.current!);
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief.id, isGenerating]);

  async function handleFieldSave(key: keyof GtmBriefData, value: string) {
    const updated: GtmBriefData = { ...gtmData, [key]: value || null };
    setGtmData(updated);
    const res = await fetch(`/api/briefs/${brief.id}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefData: JSON.stringify(updated) }),
    });
    if (!res.ok) {
      notify.error("Failed to save field");
      setGtmData(parseGtmData(brief.briefData));
    } else {
      const saved = (await res.json()) as Brief;
      setBrief(saved);
    }
  }

  async function handleDownload() {
    const res = await fetch(`/api/briefs/${brief.id}/download`);
    if (!res.ok) { notify.error("Download failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brief.title.replace(/[^a-z0-9]/gi, "_")}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const res = await fetch(`/api/briefs/${brief.id}/generate`, { method: "POST" });
    setRegenerating(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      notify.error(data.error ?? "Regeneration failed");
      return;
    }
    // Move to GENERATING — the poll effect will fire and pick up the final state
    setBrief((b) => ({ ...b, status: BriefStatus.GENERATING }));
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <GtmHeader
        brief={brief}
        onDownload={handleDownload}
        onRegenerate={handleRegenerate}
        regenerating={regenerating}
      />

      {isGenerating ? (
        <GeneratingState />
      ) : (
        <div className="space-y-4">
          {brief.status === BriefStatus.APPROVED && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/60 dark:bg-green-900/10 px-4 py-3 text-sm text-green-800 dark:text-green-300">
              <span className="font-medium">This brief has been approved and is locked for editing.</span>
            </div>
          )}
          {GTM_SECTIONS.map((section) => (
            <GtmBriefSection
              key={section.title}
              title={section.title}
              fields={section.fields}
              data={gtmData}
              onFieldSave={handleFieldSave}
              readOnly={brief.status === BriefStatus.APPROVED}
            />
          ))}
        </div>
      )}
    </div>
  );
}
