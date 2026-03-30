// SPEC: sprint-scrum.md
"use client";

import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SprintRow {
  id: string;
  name: string;
  committedHours: number;
  completedHours: number;
  isActive: boolean;
}

interface ApiResponse {
  data: SprintRow[];
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

/** Truncate a sprint name to fit in a narrow bar label */
function truncateName(name: string, max = 10): string {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function VelocityTrend() {
  const [sprints, setSprints] = useState<SprintRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sprints?limit=20")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load sprints");
        return r.json() as Promise<ApiResponse>;
      })
      .then((res) => {
        // Keep only completed (non-active) sprints, last 10 in chronological order
        const completed = res.data
          .filter((s) => !s.isActive)
          .slice(0, 10)
          .reverse();
        setSprints(completed);
      })
      .catch((err: Error) => {
        setError(err.message);
        setSprints([]);
      });
  }, []);

  if (sprints === null) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm animate-pulse">
        Loading velocity data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive text-sm">{error}</div>
    );
  }

  if (sprints.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm border rounded-lg">
        <p className="font-medium text-foreground">No completed sprints yet.</p>
        <p className="mt-1">Velocity will appear here once sprints are finished.</p>
      </div>
    );
  }

  const maxHours = Math.max(...sprints.map((s) => s.committedHours), 1);
  const avgVelocity =
    sprints.length > 0
      ? Math.round(sprints.reduce((s, sp) => s + sp.completedHours, 0) / sprints.length)
      : 0;

  // SVG polyline for the trend line drawn over bar tops
  const CHART_HEIGHT = 160; // px — the bar area height
  const BAR_WIDTH_PCT = 100 / sprints.length; // percent per bar slot

  // Each bar center x as a fraction of total width
  const points = sprints.map((s, i) => {
    const barCenterX = (i + 0.5) * BAR_WIDTH_PCT; // percent
    const barHeightPct = maxHours > 0 ? (s.completedHours / maxHours) * 100 : 0;
    const y = CHART_HEIGHT - (barHeightPct / 100) * CHART_HEIGHT;
    return { x: barCenterX, y };
  });
  // Average line y position
  const avgY = maxHours > 0 ? CHART_HEIGHT - (avgVelocity / maxHours) * CHART_HEIGHT : CHART_HEIGHT;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Velocity = completed hours (DONE tickets) per sprint. Last {sprints.length} completed sprints.
        </p>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded bg-[#22c55e]" />
            <span className="text-muted-foreground">≥80% completion</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded bg-primary/70" />
            <span className="text-muted-foreground">&lt;80%</span>
          </div>
        </div>
      </div>

      {/* Rolling average callout */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Rolling avg velocity:</span>
        <span className="font-semibold">{avgVelocity}h</span>
        <span className="inline-block w-5 border-t-2 border-dashed border-violet-500" />
      </div>

      {/* Bar chart with SVG trend overlay */}
      <div className="relative" style={{ height: `${CHART_HEIGHT + 32}px` }}>
        {/* Bars */}
        <div
          className="absolute inset-x-0 top-0 flex items-end gap-px"
          style={{ height: `${CHART_HEIGHT}px` }}
        >
          {sprints.map((sprint) => {
            const completionPct =
              sprint.committedHours > 0
                ? (sprint.completedHours / sprint.committedHours) * 100
                : 0;
            const isGreen = completionPct >= 80;
            const barHeightPct =
              maxHours > 0 ? (sprint.completedHours / maxHours) * 100 : 0;
            const committedBarPct =
              maxHours > 0 ? (sprint.committedHours / maxHours) * 100 : 0;

            return (
              <div
                key={sprint.id}
                className="flex-1 flex flex-col justify-end relative group"
                style={{ height: "100%" }}
              >
                {/* Committed bar (background) */}
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t bg-muted"
                  style={{ height: `${committedBarPct}%` }}
                />
                {/* Completed bar (foreground) */}
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t transition-all ${
                    isGreen ? "bg-[#22c55e]" : "bg-primary/70"
                  }`}
                  style={{ height: `${barHeightPct}%` }}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-popover border rounded-md px-2 py-1 text-xs shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <p className="font-medium">{sprint.name}</p>
                  <p>Completed: {sprint.completedHours}h</p>
                  <p>Committed: {sprint.committedHours}h</p>
                  <p>{Math.round(completionPct)}% done</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* SVG trend line overlay */}
        <svg
          className="absolute inset-x-0 top-0 pointer-events-none"
          width="100%"
          height={CHART_HEIGHT}
          preserveAspectRatio="none"
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
        >
          {/* Average dashed line */}
          <line
            x1="0"
            y1={avgY}
            x2="100"
            y2={avgY}
            stroke="#7c3aed"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          {/* Trend polyline */}
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#7c3aed"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.5"
          />
          {/* Dots on trend line */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="#7c3aed"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* X-axis labels */}
        <div
          className="absolute inset-x-0 flex"
          style={{ top: `${CHART_HEIGHT + 4}px` }}
        >
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="flex-1 text-center text-[10px] text-muted-foreground truncate px-0.5"
              title={sprint.name}
            >
              {truncateName(sprint.name)}
            </div>
          ))}
        </div>
      </div>

      {/* Y-axis callout (max) */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0h</span>
        <span>{maxHours}h</span>
      </div>

      {/* Per-sprint table */}
      <div className="rounded-lg border overflow-hidden mt-2">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Sprint</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Committed</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Completed</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">% Done</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sprints.map((sprint) => {
              const pct =
                sprint.committedHours > 0
                  ? Math.round((sprint.completedHours / sprint.committedHours) * 100)
                  : 0;
              return (
                <tr key={sprint.id} className="hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-medium">{sprint.name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                    {sprint.committedHours}h
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                    {sprint.completedHours}h
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right tabular-nums font-semibold ${
                      pct >= 80 ? "text-[#008146]" : pct >= 60 ? "text-amber-600" : "text-red-600"
                    }`}
                  >
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
