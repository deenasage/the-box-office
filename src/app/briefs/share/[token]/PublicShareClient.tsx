// SPEC: brief-to-epic-workflow.md
// Public stakeholder review page — shows full GTM brief (read-only) + approve button.
// No auth required to view. Approve button calls /api/briefs/[id]/approve (auth required).
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CheckCircle2, AlertTriangle, ThumbsUp } from "lucide-react";
import { GtmBriefSection } from "@/components/briefs/GtmBriefSection";
import { GTM_SECTIONS } from "@/components/briefs/gtm-sections";
import type { GtmBriefData } from "@/components/briefs/brief-types";
import { formatDate } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PublicBrief {
  id: string;
  title: string;
  status: string;
  briefData: string | null;
  creator: { id: string; name: string };
  createdAt: string;
}

interface ApiData {
  brief: PublicBrief;
  shareTokenId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function parseGtmData(raw: string | null): GtmBriefData {
  if (!raw) return emptyGtmData();
  try { return { ...emptyGtmData(), ...(JSON.parse(raw) as Partial<GtmBriefData>) }; }
  catch { return emptyGtmData(); }
}

// ── Approve button ─────────────────────────────────────────────────────────────

function ApproveButton({ briefId, onApproved }: { briefId: string; onApproved: () => void }) {
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setApproving(true);
    setError(null);
    const res = await fetch(`/api/briefs/${briefId}/approve`, { method: "POST" });
    setApproving(false);
    if (res.status === 401) {
      setError("You must be logged in to approve this brief.");
      return;
    }
    if (!res.ok) {
      setError("Could not approve. Please try again.");
      return;
    }
    onApproved();
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleApprove} disabled={approving} className="gap-1.5">
        {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
        Approve Brief
      </Button>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type LoadState =
  | { status: "loading" }
  | { status: "revoked" }
  | { status: "error" }
  | { status: "ok"; data: ApiData };

export function PublicShareClient({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/briefs/share/${token}`);
      if (res.status === 410 || res.status === 404) {
        setState({ status: "revoked" });
        return;
      }
      if (!res.ok) { setState({ status: "error" }); return; }
      const json = (await res.json()) as { data: ApiData };
      setState({ status: "ok", data: json.data });
    })();
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.status === "revoked") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center space-y-2">
        <AlertTriangle className="h-8 w-8 mx-auto text-destructive/60" />
        <h2 className="text-lg font-semibold">This link is no longer active</h2>
        <p className="text-sm text-muted-foreground">
          The brief may have been withdrawn or the link revoked. Please contact the sender directly.
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center space-y-2">
        <AlertTriangle className="h-8 w-8 mx-auto text-destructive/60" />
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">Unable to load this brief. Please try again later.</p>
      </div>
    );
  }

  const { brief } = state.data;
  const gtmData = parseGtmData(brief.briefData);
  const displayTitle = gtmData.Title ?? brief.title;
  const isApproved = approved || brief.status === "APPROVED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-medium">GTM</Badge>
          <Badge variant="outline" className="text-xs">
            {isApproved ? "Approved" : "Under Review"}
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{displayTitle} (GTM Launch)</h1>
        <p className="text-sm text-muted-foreground">
          Shared by {brief.creator.name} &middot; {formatDate(brief.createdAt)}
        </p>
      </div>

      {/* Approve / approved banner */}
      {isApproved ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">This brief has been approved.</p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Review the brief below. Click Approve when you&apos;re happy with it.
          </p>
          <ApproveButton briefId={brief.id} onApproved={() => setApproved(true)} />
        </div>
      )}

      {/* Full brief — all GTM sections, read-only */}
      <div className="space-y-4">
        {GTM_SECTIONS.map((section) => (
          <GtmBriefSection
            key={section.title}
            title={section.title}
            fields={section.fields}
            data={gtmData}
            onFieldSave={() => {}}
            readOnly
          />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground pt-4 border-t">
        <FileText className="inline h-3 w-3 mr-1" />
        Powered by <span className="font-medium">The Box Office</span>
      </p>
    </div>
  );
}
