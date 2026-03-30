// SPEC: capacity-planning.md
// SPEC: design-improvements.md
import { Team } from "@prisma/client";

export interface HeatmapCell {
  sprintId: string;
  utilPct: number | null;
}

export interface HeatmapRow {
  userId: string;
  name: string;
  team: Team;
  cells: HeatmapCell[];
}

export interface HeatmapResponse {
  sprints: { id: string; name: string }[];
  rows: HeatmapRow[];
}

// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
export function cellStyle(pct: number | null): string {
  if (pct === null) return "bg-muted text-muted-foreground";
  if (pct >= 100) return "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20";
  if (pct >= 80)  return "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20";
  return "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20";
}

export function cellLabel(pct: number | null): string {
  return pct === null ? "—" : `${pct}%`;
}

/** Group rows by team, preserving alphabetical order within each team. */
export function groupByTeam(rows: HeatmapRow[]): Map<Team, HeatmapRow[]> {
  const map = new Map<Team, HeatmapRow[]>();
  for (const row of rows) {
    const existing = map.get(row.team) ?? [];
    existing.push(row);
    map.set(row.team, existing);
  }
  return map;
}
