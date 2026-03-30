// SPEC: capacity-planning.md
"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonTable } from "@/components/ui/skeletons";
import { TEAM_BADGE_COLORS } from "@/lib/constants";
import {
  cellStyle,
  cellLabel,
  groupByTeam,
  type HeatmapResponse,
  type HeatmapRow,
  type HeatmapCell,
} from "./heatmap-utils";
import { Team } from "@prisma/client";

// ── Legend ─────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-4">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-green-200" aria-hidden="true" />
        Under capacity
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-yellow-200" aria-hidden="true" />
        Near capacity
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-red-200" aria-hidden="true" />
        Overcommitted
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-muted border" aria-hidden="true" />
        No data
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function CapacityHeatmap() {
  const [limit, setLimit] = useState<string>("6");
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  function loadData() {
    setLoading(true);
    setFetchError(false);
    setData(null);
    fetch(`/api/capacity/heatmap?limit=${limit}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((res: HeatmapResponse) => { setData(res); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
  }

  useEffect(() => { loadData(); }, [limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups: Map<Team, HeatmapRow[]> = data ? groupByTeam(data.rows) : new Map();
  const isEmpty = !loading && data !== null && data.rows.length === 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Utilization across the last {limit} completed sprints
        </p>
        <Select value={limit} onValueChange={(v) => { if (v !== null) setLimit(v); }}>
          <SelectTrigger className="w-36 h-8 text-sm" aria-label="Sprint window">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 sprints</SelectItem>
            <SelectItem value="6">Last 6 sprints</SelectItem>
            <SelectItem value="12">Last 12 sprints</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && <SkeletonTable rows={6} />}

      {fetchError && (
        <div className="rounded-lg border py-8 text-center space-y-2">
          <p className="text-sm text-destructive">Failed to load heatmap data.</p>
          <button onClick={loadData} className="text-xs text-primary hover:underline">Retry</button>
        </div>
      )}

      {isEmpty && (
        <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
          No capacity data yet.
        </div>
      )}

      {!loading && data && data.rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs border-collapse min-w-[480px]">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-40 sticky left-0 bg-muted/50 z-10">
                  Member
                </th>
                {data.sprints.map((s) => (
                  <th
                    key={s.id}
                    className="text-center px-2 py-2 font-medium text-muted-foreground whitespace-nowrap"
                  >
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(groups.entries()).map(([team, members]) => (
                <>
                  <tr key={`team-${team}`} className="border-t border-b bg-muted/30">
                    <td colSpan={data.sprints.length + 1} className="px-3 py-1">
                      <span
                        className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border ${TEAM_BADGE_COLORS[team]}`}
                      >
                        {team}
                      </span>
                    </td>
                  </tr>
                  {members.map((row: HeatmapRow) => (
                    <tr key={row.userId} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-1.5 font-medium truncate max-w-[160px] sticky left-0 bg-background z-10 border-r">
                        {row.name}
                      </td>
                      {row.cells.map((cell: HeatmapCell) => (
                        <td
                          key={cell.sprintId}
                          className="text-center px-2 py-1.5"
                          aria-label={`${row.name} — ${data.sprints.find((s) => s.id === cell.sprintId)?.name ?? cell.sprintId}: ${cellLabel(cell.utilPct)}`}
                        >
                          <span className={`inline-block px-1.5 py-0.5 rounded font-medium w-12 text-center ${cellStyle(cell.utilPct)}`}>
                            {cellLabel(cell.utilPct)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data && data.rows.length > 0 && <Legend />}
    </div>
  );
}
