// SPEC: brief-to-epic-workflow.md
import { Team } from "@prisma/client";

export interface GanttItem {
  id: string;
  epicId: string;
  title: string;
  team: Team | null;
  color: string | null;
  startDate: string;
  endDate: string;
  order: number;
  aiGenerated: boolean;
  slippedFromSprintId: string | null;
  slippedAt: string | null;
}

export const TEAM_COLORS: Record<string, string> = {
  CONTENT: "#0ea5e9",
  DESIGN: "#8b5cf6",
  SEO: "#22c55e",
  WEM: "#f97316",
  PAID_MEDIA: "#a855f7",
  ANALYTICS: "#06b6d4",
};

export const PRESET_COLORS = ["#6366f1", "#3b82f6", "#8b5cf6", "#22c55e", "#f97316", "#ec4899"];

export const TEAM_OPTIONS: Array<{ value: Team; label: string }> = [
  { value: "CONTENT", label: "Content" },
  { value: "DESIGN", label: "Design" },
  { value: "SEO", label: "SEO" },
  { value: "WEM", label: "WEM" },
  { value: "PAID_MEDIA", label: "Paid Media" },
  { value: "ANALYTICS", label: "Analytics" },
];

export function resolveBarColor(item: GanttItem): string {
  if (item.color) return item.color;
  if (item.team && TEAM_COLORS[item.team]) return TEAM_COLORS[item.team];
  return "#6366f1";
}

export function getMonthHeaders(
  start: Date,
  end: Date
): Array<{ label: string; leftPct: number; widthPct: number }> {
  const totalMs = end.getTime() - start.getTime();
  const headers: ReturnType<typeof getMonthHeaders> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    const clampedStart = monthStart < start ? start : monthStart;
    const clampedEnd = monthEnd > end ? end : monthEnd;
    const leftPct = ((clampedStart.getTime() - start.getTime()) / totalMs) * 100;
    const widthPct = ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100;
    // Format: "Jan '26"
    const month = cursor.toLocaleDateString("en-US", { month: "short" });
    const year = String(cursor.getFullYear()).slice(2);
    headers.push({ label: `${month} '${year}`, leftPct, widthPct });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return headers;
}
