// SPEC: ai-estimation.md
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SizeBadge } from "@/components/tickets/SizeBadge";
import { Sparkles, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { TicketSize, UserRole } from "@prisma/client";
import { EstimateResult } from "./EstimateResult";
import type { AIEstimate } from "./EstimateResult";

interface AIEstimatePanelProps {
  ticketId: string;
  currentSize: TicketSize | null;
  userRole: UserRole;
}

export function AIEstimatePanel({ ticketId, currentSize, userRole }: AIEstimatePanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [estimate, setEstimate] = useState<AIEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AIEstimate[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const canAccept = userRole === UserRole.ADMIN || userRole === UserRole.TEAM_LEAD;

  async function requestEstimate() {
    setLoading(true);
    setError(null);
    setDismissed(false);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/estimate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Estimation failed.");
      } else {
        setEstimate(data);
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
      const res = await fetch(`/api/tickets/${ticketId}/estimates/${estimate.id}/accept`, {
        method: "POST",
      });
      if (res.ok) {
        setEstimate({ ...estimate, accepted: true, acceptedAt: new Date().toISOString() });
        // Refresh to reflect updated size badge in parent
        router.refresh();
      }
    } finally {
      setAccepting(false);
    }
  }

  async function dismissEstimate() {
    if (!estimate) return;
    await fetch(`/api/tickets/${ticketId}/estimates/${estimate.id}/dismiss`, { method: "POST" });
    setDismissed(true);
    setEstimate(null);
  }

  async function loadHistory() {
    if (history !== null) { setShowHistory((v) => !v); return; }
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/estimates`);
      if (res.ok) setHistory(await res.json());
    } finally {
      setHistoryLoading(false);
      setShowHistory(true);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Estimation</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={requestEstimate}
          disabled={loading}
          className="h-7 text-xs gap-1"
        >
          <Sparkles className="h-3 w-3" />
          {loading ? "Estimating…" : estimate ? "Re-estimate" : "Estimate with AI"}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
      )}

      {dismissed && (
        <p className="text-xs text-muted-foreground">Estimate dismissed.</p>
      )}

      {estimate && !dismissed && (
        <EstimateResult
          estimate={estimate}
          canAccept={canAccept}
          accepting={accepting}
          onAccept={() => void acceptEstimate()}
          onDismiss={() => void dismissEstimate()}
        />
      )}

      {/* History toggle */}
      <button
        onClick={() => void loadHistory()}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {historyLoading ? "Loading…" : "Estimate history"}
      </button>

      {showHistory && history !== null && (
        <div className="space-y-2 pt-1">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No previous estimates.</p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs border rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <SizeBadge size={h.suggestedSize} />
                  <span className="text-muted-foreground">{Math.round(h.confidence * 100)}% confidence</span>
                  {h.accepted && (
                    <span className="text-[#008146] dark:text-[#00D93A] flex items-center gap-0.5">
                      <CheckCircle2 className="h-3 w-3" /> accepted
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
