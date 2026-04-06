// SPEC: capacity-ai.md
"use client";

import { useState } from "react";
import { isPrivileged } from "@/lib/role-helpers";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, Zap } from "lucide-react";
import { UserRole } from "@prisma/client";
import { SprintSuggestionCard } from "./SprintSuggestionCard";
import type { SprintScenario } from "./SprintSuggestionCard";

interface SprintRecommendation {
  sprintId: string;
  sprintName: string;
  rationale: string;
}

interface SuggestionResult {
  id: string;
  scenarios: SprintScenario[];
  recommendation: SprintRecommendation | null;
  ticketCount: number;
  sprintsEvaluated: number;
}

interface SprintSuggestionPanelProps {
  briefId: string;
  ticketCount: number;
  userRole: UserRole;
}

export function SprintSuggestionPanel({ briefId, ticketCount, userRole }: SprintSuggestionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);

  const canApply = isPrivileged(userRole);

  async function suggest() {
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(false);
    try {
      const res = await fetch(`/api/briefs/${briefId}/suggest-sprint`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sprint suggestion failed.");
      } else {
        setResult(data);
        setExpandedScenario(data.recommendation?.sprintId ?? data.scenarios[0]?.sprintId ?? null);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function applyRecommendation() {
    if (!result?.recommendation) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/sprint-suggestions/${result.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId: result.recommendation.sprintId }),
      });
      if (res.ok) {
        setApplied(true);
        setConfirmApply(false);
      }
    } finally {
      setApplying(false);
    }
  }

  async function applyScenario(sprintId: string) {
    if (!result) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/sprint-suggestions/${result.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId }),
      });
      if (res.ok) setApplied(true);
    } finally {
      setApplying(false);
    }
  }

  function handleToggleExpand(sprintId: string) {
    setExpandedScenario((prev) => (prev === sprintId ? null : sprintId));
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Sprint Placement AI</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={suggest}
          disabled={loading || ticketCount === 0}
          className="h-7 text-xs gap-1"
        >
          <Sparkles className="h-3 w-3" />
          {loading ? "Analyzing…" : result ? "Re-analyze" : "Suggest Sprint"}
        </Button>
      </div>

      {ticketCount === 0 && (
        <p className="text-xs text-muted-foreground">Generate tickets first to get a sprint suggestion.</p>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
      )}

      {applied && (
        <div className="flex items-center gap-1.5 text-xs text-[#008146] dark:text-[#00D93A]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Sprint applied — tickets have been moved.
        </div>
      )}

      {result && !applied && (
        <div className="space-y-3">
          {/* Recommendation banner */}
          {result.recommendation && (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Recommended: {result.recommendation.sprintName}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {result.recommendation.rationale}
              </p>
              {canApply && !confirmApply && (
                <Button
                  size="sm"
                  className="h-7 text-xs mt-1"
                  onClick={() => setConfirmApply(true)}
                >
                  Apply Recommendation
                </Button>
              )}
              {canApply && confirmApply && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Move {result.ticketCount} ticket{result.ticketCount !== 1 ? "s" : ""} to {result.recommendation.sprintName}?
                  </span>
                  <Button size="sm" className="h-6 text-xs" onClick={applyRecommendation} disabled={applying}>
                    {applying ? "Applying…" : "Confirm"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setConfirmApply(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Scenario cards */}
          <div className="space-y-2">
            {result.scenarios.map((scenario) => (
              <SprintSuggestionCard
                key={scenario.sprintId}
                scenario={scenario}
                isRecommended={result.recommendation?.sprintId === scenario.sprintId}
                isExpanded={expandedScenario === scenario.sprintId}
                canApply={canApply}
                applying={applying}
                onToggleExpand={handleToggleExpand}
                onApply={applyScenario}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
