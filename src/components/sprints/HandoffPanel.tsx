// SPEC: handoffs
"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { HandoffRow, EmptyHandoffs, type HandoffDependency } from "./HandoffRow";

// ── API response type ─────────────────────────────────────────────────────────

interface HandoffsResponse {
  data: HandoffDependency[];
  nextSprint: { id: string; name: string } | null;
}

// ── HandoffPanel ──────────────────────────────────────────────────────────────

interface HandoffPanelProps {
  sprintId: string;
}

export function HandoffPanel({ sprintId }: HandoffPanelProps) {
  const [handoffs, setHandoffs] = useState<HandoffDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/sprints/${sprintId}/handoffs`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as HandoffsResponse;
        if (!cancelled) {
          setHandoffs(json.data ?? []);
          // Auto-collapse when empty
          if ((json.data ?? []).length === 0) setOpen(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load handoffs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sprintId]);

  const count = handoffs.length;
  const headerId = `handoff-panel-${sprintId}`;

  return (
    <section aria-labelledby={headerId} className="space-y-2">
      {/* Header / toggle */}
      <button
        id={headerId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left group"
        aria-expanded={open}
        aria-controls={`handoff-list-${sprintId}`}
      >
        <h2 className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors">
          Cross-Team Handoffs
          {!loading && (
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">({count})</span>
          )}
        </h2>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" aria-hidden="true" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" aria-hidden="true" />
        }
      </button>

      {/* Content */}
      {open && (
        <div id={`handoff-list-${sprintId}`} className="space-y-2">
          {loading && (
            <div className="py-6 text-center" role="status" aria-label="Loading handoffs">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" aria-hidden="true" />
              <p className="text-sm text-muted-foreground mt-2">Loading handoffs…</p>
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-destructive py-4" role="alert">
              Failed to load handoffs: {error}
            </p>
          )}

          {!loading && !error && count === 0 && <EmptyHandoffs />}

          {!loading && !error && count > 0 && (
            <div className="space-y-2" role="list" aria-label="Cross-team handoff dependencies">
              {handoffs.map((h) => (
                <HandoffRow key={h.id} handoff={h} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
