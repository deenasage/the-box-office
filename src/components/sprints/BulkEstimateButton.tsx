// SPEC: ai-estimation.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { TicketSize } from "@prisma/client";

interface EstimateResult {
  ticketId: string;
  title: string;
  suggestedSize: TicketSize;
  confidence: number;
  estimateId: string;
}

interface EstimateError {
  ticketId: string;
  title: string;
  error: string;
}

interface BulkEstimateButtonProps {
  sprintId: string;
  unsizedCount: number;
}

export function BulkEstimateButton({ sprintId, unsizedCount }: BulkEstimateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EstimateResult[] | null>(null);
  const [errors, setErrors] = useState<EstimateError[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (unsizedCount === 0) return null;

  async function run() {
    setLoading(true);
    setError(null);
    setResults(null);
    setErrors([]);
    try {
      const res = await fetch(`/api/sprints/${sprintId}/estimate-bulk`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bulk estimation failed.");
      } else {
        setResults(data.results);
        setErrors(data.errors ?? []);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={run}
          disabled={loading}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? "Estimating…" : `Estimate ${unsizedCount} unsized ticket${unsizedCount !== 1 ? "s" : ""} with AI`}
        </Button>
        {results !== null && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#008146] dark:text-[#00D93A]" />
            {results.length} estimates created
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {results !== null && results.length > 0 && (
        <div className="rounded-lg border divide-y text-xs">
          {results.map((r) => (
            <div key={r.ticketId} className="flex items-center justify-between px-3 py-2">
              <span className="truncate text-muted-foreground flex-1 mr-2">{r.title}</span>
              <span className="font-mono font-medium text-primary">{r.suggestedSize}</span>
              <span className="ml-2 text-muted-foreground">{Math.round(r.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((e) => (
            <div key={e.ticketId} className="flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span><span className="font-medium">{e.title}</span>: {e.error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
