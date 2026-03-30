// SPEC: brief-to-epic-workflow.md
// SPEC: design-improvements.md
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { TicketSize } from "@prisma/client";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AISizeEstimate {
  estimateId: string;
  suggestedSize: TicketSize;
  confidence: number;
  rationale: string;
  flags: string[];
}

interface AcceptedEstimate {
  estimateId: string;
  suggestedSize: TicketSize;
  rationale: string;
}

interface AITicketSizingPanelProps {
  ticketId: string;
  hasBrief: boolean;
  attachmentCount: number;
  /** Pre-existing accepted estimate — if set, show the "AI sized" badge only. */
  acceptedEstimate: AcceptedEstimate | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
const SIZE_COLORS: Record<TicketSize, string> = {
  XS:  "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  S:   "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20",
  M:   "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20",
  L:   "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20",
  XL:  "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/20",
  XXL: "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20",
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.7
      ? "bg-[#008146] dark:bg-[#00D93A]"
      : value >= 0.4
      ? "bg-amber-500"
      : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AITicketSizingPanel({
  ticketId,
  hasBrief,
  attachmentCount,
  acceptedEstimate,
}: AITicketSizingPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [estimate, setEstimate] = useState<AISizeEstimate | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show if there's no accepted estimate yet, and there's a brief or attachments
  const hasContext = hasBrief || attachmentCount > 0;
  if (!hasContext) return null;

  // If there's a pre-existing accepted estimate, show a compact badge
  if (acceptedEstimate && !accepted) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#008146] dark:text-[#00D93A] flex-shrink-0" />
        <span className="text-muted-foreground">AI sized:</span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
            SIZE_COLORS[acceptedEstimate.suggestedSize]
          )}
        >
          {acceptedEstimate.suggestedSize}
        </span>
        <span className="text-muted-foreground">(accepted)</span>
        <span
          className="ml-1 text-muted-foreground truncate max-w-xs"
          title={acceptedEstimate.rationale}
        >
          — {acceptedEstimate.rationale.slice(0, 80)}
          {acceptedEstimate.rationale.length > 80 ? "…" : ""}
        </span>
      </div>
    );
  }

  async function requestEstimate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/ai-size`, {
        method: "POST",
      });
      const json = (await res.json()) as { data?: AISizeEstimate; error?: string };
      if (!res.ok) {
        setError(json.error ?? "AI sizing failed.");
      } else if (json.data) {
        setEstimate(json.data);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function acceptEstimate() {
    if (!estimate) return;
    setAccepting(true);
    try {
      const res = await fetch(
        `/api/tickets/${ticketId}/ai-size/${estimate.estimateId}/accept`,
        { method: "POST" }
      );
      if (res.ok) {
        setAccepted(true);
        router.refresh();
      } else {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Failed to accept estimate.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Sizing</h3>
          <span className="text-xs text-muted-foreground">
            {hasBrief ? "brief" : ""}
            {hasBrief && attachmentCount > 0 ? " + " : ""}
            {attachmentCount > 0 ? `${attachmentCount} attachment${attachmentCount !== 1 ? "s" : ""}` : ""}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={loading}
          onClick={() => void requestEstimate()}
        >
          <Sparkles className="h-3 w-3" />
          {loading
            ? "Analysing brief and attachments…"
            : estimate
            ? "Re-analyse"
            : "Get AI Size Estimate"}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <svg
            className="animate-spin h-3 w-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Analysing brief and attachments…
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
          {error}
        </p>
      )}

      {estimate && !accepted && (
        <div className="space-y-3 pt-1">
          {/* Size + confidence */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Suggested size</p>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold",
                  SIZE_COLORS[estimate.suggestedSize]
                )}
              >
                {estimate.suggestedSize}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Confidence</p>
              <ConfidenceBar value={estimate.confidence} />
            </div>
          </div>

          {/* Rationale */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {estimate.rationale}
          </p>

          {/* Flags */}
          {estimate.flags.length > 0 && (
            <ul className="space-y-1">
              {estimate.flags.map((flag, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded px-2 py-1.5"
                >
                  <span>⚠️</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => void acceptEstimate()}
              disabled={accepting}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {accepting ? "Applying…" : `Accept this size (${estimate.suggestedSize})`}
            </Button>
            <p className="text-xs text-muted-foreground">
              Override: change size manually in the ticket editor.
            </p>
          </div>
        </div>
      )}

      {accepted && estimate && (
        <div className="flex items-center gap-1.5 text-xs text-[#008146] dark:text-[#00D93A]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Size {estimate.suggestedSize} applied
        </div>
      )}
    </div>
  );
}
