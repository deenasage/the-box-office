// SPEC: brief-to-epic-workflow.md
"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart2, Plus, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GanttItem, TEAM_COLORS, getMonthHeaders, resolveBarColor } from "./gantt-types";
import { GanttItemDialog } from "./GanttItemDialog";
import { notify } from "@/lib/toast";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  epicId: string;
  epicStartDate?: string | null;
  epicEndDate?: string | null;
  canEdit: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeBounds(
  epicStartDate: string | null | undefined,
  epicEndDate: string | null | undefined,
  items: GanttItem[]
): { start: Date; end: Date } | null {
  if (epicStartDate && epicEndDate) {
    return { start: new Date(epicStartDate), end: new Date(epicEndDate) };
  }
  if (items.length === 0) return null;
  const starts = items.map((i) => new Date(i.startDate).getTime());
  const ends = items.map((i) => new Date(i.endDate).getTime());
  return { start: new Date(Math.min(...starts)), end: new Date(Math.max(...ends)) };
}

function barPosition(
  item: GanttItem,
  bounds: { start: Date; end: Date }
): { left: string; width: string } {
  const totalMs = bounds.end.getTime() - bounds.start.getTime();
  if (totalMs <= 0) return { left: "0%", width: "2%" };
  const leftPct = ((new Date(item.startDate).getTime() - bounds.start.getTime()) / totalMs) * 100;
  const rawWidth =
    ((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / totalMs) * 100;
  return {
    left: `${Math.max(0, leftPct).toFixed(2)}%`,
    width: `${Math.max(2, rawWidth).toFixed(2)}%`,
  };
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function GanttSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6" aria-busy aria-label="Loading Gantt chart">
      <div className="h-5 w-32 animate-pulse rounded bg-muted mb-4" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EpicGanttChart({ epicId, epicStartDate, epicEndDate, canEdit }: Props) {
  const [items, setItems] = useState<GanttItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dialogItem, setDialogItem] = useState<Partial<GanttItem> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/epics/${epicId}/gantt`);
      if (res.ok) {
        const json = await res.json();
        setItems(
          (json.data as GanttItem[] ?? []).sort((a, b) => a.order - b.order)
        );
      } else {
        setFetchError("Failed to load Gantt items");
      }
    } catch {
      setFetchError("Failed to load Gantt items");
    } finally {
      setLoading(false);
    }
  }, [epicId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/epics/${epicId}/gantt/generate`, { method: "POST" });
      if (!res.ok) {
        let serverMsg = "";
        try { serverMsg = ((await res.json()) as { error?: string }).error ?? ""; } catch { /* ignore */ }
        notify.error(serverMsg || "Failed to generate Gantt chart");
        return;
      }
      await fetchItems();
    } catch {
      notify.error("Failed to generate Gantt chart");
    } finally {
      setGenerating(false);
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    setDialogItem(null);
  }

  if (loading) return <GanttSkeleton />;

  if (fetchError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {fetchError}
      </div>
    );
  }

  const bounds = computeBounds(epicStartDate, epicEndDate, items);
  const monthHeaders = bounds ? getMonthHeaders(bounds.start, bounds.end) : [];

  // Today marker position
  const todayPct = bounds
    ? Math.max(0, Math.min(100,
        ((Date.now() - bounds.start.getTime()) / (bounds.end.getTime() - bounds.start.getTime())) * 100
      ))
    : null;

  return (
    <section aria-label="Epic Gantt chart" className="rounded-lg border border-border bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Gantt Chart</h2>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              aria-label="Generate Gantt items with AI"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {generating ? "Generating…" : "Generate with AI"}
            </Button>
            <Button
              size="sm"
              onClick={() => { setDialogItem({}); setDialogOpen(true); }}
              aria-label="Add Gantt item manually"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Add item
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <BarChart2 className="h-10 w-10 opacity-30" aria-hidden />
          <p className="text-sm">No Gantt items yet.</p>
          {canEdit && (
            <p className="text-xs">
              Use "Generate with AI" to auto-populate from this epic's tickets and brief.
            </p>
          )}
        </div>
      )}

      {/* Chart */}
      {items.length > 0 && bounds && (
        <div className="overflow-x-auto p-4">
          <div className="min-w-150">
            {/* Month header row */}
            <div
              className="relative mb-2 h-6 text-xs text-muted-foreground"
              aria-hidden="true"
            >
              {monthHeaders.map((m, idx) => (
                <div
                  key={idx}
                  className="absolute truncate border-l border-border/50 pl-1 text-[11px]"
                  style={{ left: `${m.leftPct.toFixed(2)}%`, width: `${m.widthPct.toFixed(2)}%` }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            <div className="mb-1 border-t border-border/40" />

            {/* Item rows */}
            <div className="space-y-1.5" role="list" aria-label="Gantt items">
              {items.map((item) => {
                const pos = barPosition(item, bounds);
                const barColor = resolveBarColor(item);
                const truncated = item.title.length > 20 ? item.title.slice(0, 19) + "…" : item.title;
                const isOverdue = new Date(item.endDate) < new Date();
                const isAiGenerated = item.aiGenerated;

                return (
                  <div key={item.id} className="flex items-center gap-3" role="listitem">
                    {/* Left label */}
                    <div
                      className="w-40 shrink-0 truncate text-right text-xs text-muted-foreground"
                      title={item.title}
                    >
                      {item.team && (
                        <span
                          className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                          style={{ backgroundColor: TEAM_COLORS[item.team] ?? "#6366f1" }}
                          aria-label={item.team}
                        />
                      )}
                      {truncated}
                    </div>

                    {/* Bar track */}
                    <div className="relative h-7 flex-1 rounded bg-muted/40">
                      {/* Today marker */}
                      {todayPct !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-red-500/70 z-10 pointer-events-none"
                          style={{ left: `${todayPct}%` }}
                          title="Today"
                        />
                      )}
                      <button
                        type="button"
                        className={`absolute flex h-full cursor-pointer items-center rounded px-2 text-[11px] font-medium text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-default disabled:hover:opacity-100${isOverdue ? " opacity-60" : ""}`}
                        style={{ left: pos.left, width: pos.width, backgroundColor: barColor }}
                        onClick={() => canEdit && (setDialogItem(item), setDialogOpen(true))}
                        aria-label={canEdit ? `Edit ${item.title}` : item.title}
                        disabled={!canEdit}
                      >
                        {isOverdue && (
                          <span className="mr-0.5 shrink-0 text-red-300" aria-label="Overdue">●</span>
                        )}
                        {item.slippedAt && (
                          <span
                            className="mr-1 shrink-0"
                            title="Slipped from sprint"
                            aria-label="Slipped from sprint"
                          >
                            <AlertCircle className="h-3 w-3 text-orange-300" aria-hidden />
                          </span>
                        )}
                        <span className="truncate">{truncated}</span>
                        {isAiGenerated && (
                          <span className="ml-auto shrink-0 text-[8px] bg-black/20 rounded px-0.5 leading-tight">
                            AI
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit dialog */}
      <GanttItemDialog
        open={dialogOpen}
        item={dialogItem}
        epicId={epicId}
        onClose={closeDialog}
        onSaved={() => { closeDialog(); fetchItems(); }}
      />
    </section>
  );
}
