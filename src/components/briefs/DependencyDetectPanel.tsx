// SPEC: dependencies.md
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Team } from "@prisma/client";
import { useDependencyDetect, AIDetectedDependency } from "@/hooks/useDependencyDetect";

interface DependencyDetectPanelProps {
  briefId: string;
  ticketCount: number;
  userRole: string;
}

const TEAM_DOT_COLORS: Record<Team, string> = {
  CONTENT: "bg-sky-500",
  DESIGN: "bg-violet-500",
  SEO: "bg-[#008146]",
  WEM: "bg-amber-500",
  PAID_MEDIA: "bg-purple-500",
  ANALYTICS: "bg-cyan-500",
};

const DEP_TYPE_LABELS: Record<string, string> = {
  BLOCKS: "BLOCKS",
  BLOCKED_BY: "BLOCKED BY",
  RELATED: "RELATED",
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.7 ? "bg-[#008146] dark:bg-[#00D93A]" : value >= 0.4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-7 text-right">{pct}%</span>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  canConfirm,
  onConfirm,
  onReject,
}: {
  suggestion: AIDetectedDependency;
  canConfirm: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <div className="px-3 py-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span
          className={cn("h-2 w-2 rounded-full shrink-0", TEAM_DOT_COLORS[suggestion.fromTicketTeam])}
        />
        <span className="font-medium truncate max-w-[150px]" title={suggestion.fromTicketTitle}>
          {suggestion.fromTicketTitle}
        </span>
        <span className="text-muted-foreground text-xs shrink-0">
          → {DEP_TYPE_LABELS[suggestion.type] ?? suggestion.type} →
        </span>
        <span
          className={cn("h-2 w-2 rounded-full shrink-0", TEAM_DOT_COLORS[suggestion.toTicketTeam])}
        />
        <span className="font-medium truncate max-w-[150px]" title={suggestion.toTicketTitle}>
          {suggestion.toTicketTitle}
        </span>
        {suggestion.confidence < 0.5 && (
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 shrink-0">
            low confidence
          </Badge>
        )}
      </div>
      <ConfidenceBar value={suggestion.confidence} />
      <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.rationale}</p>
      <div className="flex gap-2">
        {canConfirm && (
          <Button size="sm" className="h-7 text-xs" onClick={onConfirm}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirm
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={onReject}
          aria-label="Reject suggestion"
        >
          <X className="h-3 w-3 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  );
}

export function DependencyDetectPanel({
  briefId,
  ticketCount,
  userRole,
}: DependencyDetectPanelProps) {
  const {
    loading,
    confirming,
    suggestions,
    error,
    confirmedCount,
    detect,
    rejectSuggestion,
    confirmOne,
    confirmAll,
  } = useDependencyDetect(briefId);

  const canConfirm = userRole === "ADMIN" || userRole === "TEAM_LEAD";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Dependency Detection</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={detect}
          disabled={loading || ticketCount === 0}
          className="h-7 text-xs gap-1"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {loading ? "Detecting…" : suggestions !== null ? "Re-detect" : "Detect Dependencies with AI"}
        </Button>
      </div>

      {ticketCount === 0 && (
        <p className="text-xs text-muted-foreground">Generate tickets first to detect dependencies.</p>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
      )}

      {confirmedCount !== null && confirmedCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-[#008146] dark:text-[#00D93A]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {confirmedCount} {confirmedCount === 1 ? "dependency" : "dependencies"} confirmed.
        </div>
      )}

      {suggestions !== null && (
        <div className="space-y-2">
          {suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {confirmedCount ? "All suggestions processed." : "No dependencies detected."}
            </p>
          ) : (
            <>
              <div className="rounded-lg border divide-y">
                {suggestions.map((s, i) => (
                  <SuggestionRow
                    key={`${s.fromTicketId}-${s.toTicketId}-${s.type}`}
                    suggestion={s}
                    canConfirm={canConfirm && !confirming}
                    onConfirm={() => void confirmOne(i)}
                    onReject={() => rejectSuggestion(i)}
                  />
                ))}
              </div>
              {canConfirm && suggestions.length > 1 && (
                <Button
                  size="sm"
                  onClick={confirmAll}
                  disabled={confirming}
                  className="h-7 text-xs"
                >
                  {confirming ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                  Confirm All ({suggestions.length})
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
