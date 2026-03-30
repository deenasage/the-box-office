// SPEC: sprint-scrum.md
"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { TEAM_LABELS } from "@/lib/constants";
import { Team } from "@prisma/client";
import type { SprintCompareSummary } from "@/app/api/sprints/compare/route";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SprintOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface SprintCompareProps {
  sprints: SprintOption[];
  initialIds?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEAMS = Object.values(Team);

/** Return CSS class for highlighting best/worst value in a row. */
function highlightClass(
  value: number,
  best: number,
  worst: number,
  higherIsBetter: boolean
): string {
  if (value === best && value !== worst) {
    return higherIsBetter
      ? "text-green-700 dark:text-green-400 font-semibold"
      : "text-green-700 dark:text-green-400 font-semibold";
  }
  if (value === worst && value !== best) {
    return "text-red-600 dark:text-red-400 font-medium";
  }
  return "";
}

function bestWorst(values: number[]): { best: number; worst: number } {
  return { best: Math.max(...values), worst: Math.min(...values) };
}

function bestWorstLow(values: number[]): { best: number; worst: number } {
  return { best: Math.min(...values), worst: Math.max(...values) };
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SprintCompare({ sprints, initialIds = [] }: SprintCompareProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialIds.slice(0, 5)
  );
  const [summaries, setSummaries] = useState<SprintCompareSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSprint = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev; // cap at 5
      return [...prev, id];
    });
    setSummaries(null); // clear stale results when selection changes
  }, []);

  const runComparison = useCallback(async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sprints/compare?ids=${selectedIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch comparison data");
      const json = (await res.json()) as { data: SprintCompareSummary[] };
      setSummaries(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedIds]);

  // Pre-compute best/worst for each numeric metric
  const metricRanges =
    summaries && summaries.length > 1
      ? {
          committed: bestWorst(summaries.map((s) => s.committedHours)),
          completed: bestWorst(summaries.map((s) => s.completedHours)),
          completionRate: bestWorst(summaries.map((s) => s.completionRate)),
          ticketCount: bestWorst(summaries.map((s) => s.ticketCount)),
          doneCount: bestWorst(summaries.map((s) => s.doneCount)),
        }
      : null;

  const maxCompleted = summaries
    ? Math.max(...summaries.map((s) => s.completedHours), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Sprint selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Sprints to Compare</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose 2 to 5 sprints. Best values are highlighted in green, worst in red.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {sprints.map((sprint) => {
              const selected = selectedIds.includes(sprint.id);
              const disabled = !selected && selectedIds.length >= 5;
              return (
                <button
                  key={sprint.id}
                  onClick={() => !disabled && toggleSprint(sprint.id)}
                  disabled={disabled}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : disabled
                      ? "border-muted bg-muted/40 text-muted-foreground cursor-not-allowed opacity-50"
                      : "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer",
                  ].join(" ")}
                  aria-pressed={selected}
                >
                  {sprint.name}
                  {selected && (
                    <span className="text-[10px] text-primary/70">
                      {formatDate(sprint.startDate)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={runComparison}
              disabled={selectedIds.length < 2 || loading}
              size="sm"
            >
              {loading ? "Loading..." : "Compare Selected"}
            </Button>
            {selectedIds.length < 2 && (
              <p className="text-xs text-muted-foreground">
                Select at least 2 sprints
              </p>
            )}
            {selectedIds.length >= 5 && (
              <p className="text-xs text-muted-foreground">Maximum 5 sprints</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Comparison results */}
      {summaries && summaries.length > 0 && (
        <div className="space-y-6">
          {/* Metrics table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th className="w-45">Metric</th>
                    {summaries.map((s) => (
                      <th key={s.id} className="text-center">
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground font-normal">
                          {formatDate(s.startDate)} – {formatDate(s.endDate)}
                        </div>
                        {s.isActive && (
                          <Badge variant="default" className="text-[10px] h-4 mt-0.5">
                            Active
                          </Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Committed hours */}
                  <tr>
                    <td className="font-medium text-sm">Committed Hours</td>
                    {summaries.map((s) => (
                      <td key={s.id} className="text-center tabular-nums">
                        <span
                          className={
                            metricRanges
                              ? highlightClass(
                                  s.committedHours,
                                  metricRanges.committed.best,
                                  metricRanges.committed.worst,
                                  true
                                )
                              : ""
                          }
                        >
                          {s.committedHours}h
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Completed hours */}
                  <tr>
                    <td className="font-medium text-sm">Completed Hours</td>
                    {summaries.map((s) => (
                      <td key={s.id} className="text-center tabular-nums">
                        <span
                          className={
                            metricRanges
                              ? highlightClass(
                                  s.completedHours,
                                  metricRanges.completed.best,
                                  metricRanges.completed.worst,
                                  true
                                )
                              : ""
                          }
                        >
                          {s.completedHours}h
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Completion rate */}
                  <tr>
                    <td className="font-medium text-sm">Completion Rate</td>
                    {summaries.map((s) => (
                      <td key={s.id} className="text-center tabular-nums">
                        <span
                          className={
                            metricRanges
                              ? highlightClass(
                                  s.completionRate,
                                  metricRanges.completionRate.best,
                                  metricRanges.completionRate.worst,
                                  true
                                )
                              : ""
                          }
                        >
                          {s.completionRate}%
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Ticket count */}
                  <tr>
                    <td className="font-medium text-sm">Tickets Committed</td>
                    {summaries.map((s) => (
                      <td key={s.id} className="text-center tabular-nums">
                        <span
                          className={
                            metricRanges
                              ? highlightClass(
                                  s.ticketCount,
                                  metricRanges.ticketCount.best,
                                  metricRanges.ticketCount.worst,
                                  true
                                )
                              : ""
                          }
                        >
                          {s.ticketCount}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Done ticket count */}
                  <tr>
                    <td className="font-medium text-sm">Tickets Done</td>
                    {summaries.map((s) => (
                      <td key={s.id} className="text-center tabular-nums">
                        <span
                          className={
                            metricRanges
                              ? highlightClass(
                                  s.doneCount,
                                  metricRanges.doneCount.best,
                                  metricRanges.doneCount.worst,
                                  true
                                )
                              : ""
                          }
                        >
                          {s.doneCount}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Avg velocity (completed hours = velocity in hours) */}
                  <tr>
                    <td className="font-medium text-sm">Velocity (hrs completed)</td>
                    {summaries.map((s) => (
                      <td key={s.id} className="text-center tabular-nums">
                        <span
                          className={
                            metricRanges
                              ? highlightClass(
                                  s.completedHours,
                                  metricRanges.completed.best,
                                  metricRanges.completed.worst,
                                  true
                                )
                              : ""
                          }
                        >
                          {s.completedHours}h
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Per-team breakdown rows */}
                  {TEAMS.map((team) => {
                    const hasAny = summaries.some((s) =>
                      s.teamBreakdown.some((tb) => tb.team === team)
                    );
                    if (!hasAny) return null;

                    const teamCounts = summaries.map((s) => {
                      const tb = s.teamBreakdown.find((t) => t.team === team);
                      return tb?.total ?? 0;
                    });
                    const { best, worst } = bestWorst(teamCounts);

                    return (
                      <tr key={team} className="bg-muted/20">
                        <td className="text-sm pl-6 text-muted-foreground">
                          {TEAM_LABELS[team]} tickets
                        </td>
                        {summaries.map((s) => {
                          const tb = s.teamBreakdown.find((t) => t.team === team);
                          const total = tb?.total ?? 0;
                          const done = tb?.done ?? 0;
                          return (
                            <td key={s.id} className="text-center tabular-nums">
                              <span
                                className={
                                  teamCounts.some((c) => c !== teamCounts[0])
                                    ? highlightClass(total, best, worst, true)
                                    : ""
                                }
                              >
                                {total > 0 ? `${total} (${done} done)` : "—"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* CSS bar chart — completed hours */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Completed Hours</CardTitle>
              <p className="text-xs text-muted-foreground">
                Hours of work completed (status = Done) per sprint
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {summaries.map((s) => {
                const widthPct = Math.round((s.completedHours / maxCompleted) * 100);
                return (
                  <div key={s.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {s.completedHours}h / {s.committedHours}h
                      </span>
                    </div>
                    <div className="h-5 w-full rounded bg-muted overflow-hidden">
                      <div
                        className="h-full rounded bg-primary transition-all"
                        style={{ width: `${widthPct}%` }}
                        role="progressbar"
                        aria-valuenow={s.completedHours}
                        aria-valuemax={maxCompleted}
                        aria-label={`${s.name}: ${s.completedHours} hours completed`}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
