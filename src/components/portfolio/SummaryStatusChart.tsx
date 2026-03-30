// SPEC: portfolio-view.md
import { EPIC_STATUS_LABELS, EPIC_STATUS_STYLES } from "./portfolio-types";

interface SummaryStatusChartProps {
  byStatus: { status: string; count: number }[];
}

const STATUS_BAR_COLORS: Record<string, string> = {
  INTAKE:      "bg-muted",
  IN_BRIEF:    "bg-sky-400",
  BRIEFED:     "bg-indigo-400",
  IN_PLANNING: "bg-amber-400",
  IN_PROGRESS: "bg-orange-400",
  DONE:        "bg-[#008146]",
  ON_HOLD:     "bg-slate-400",
  CANCELLED:   "bg-red-300",
};

export function SummaryStatusChart({ byStatus }: SummaryStatusChartProps) {
  const maxCount = Math.max(...byStatus.map((s) => s.count), 1);
  const total = byStatus.reduce((s, x) => s + x.count, 0);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No initiatives yet.</p>;
  }

  return (
    <div className="space-y-2.5">
      {byStatus.map(({ status, count }) => {
        if (count === 0) return null;
        const widthPct = Math.round((count / maxCount) * 100);
        return (
          <div key={status} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">
              {EPIC_STATUS_LABELS[status] ?? status}
            </span>
            <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all ${STATUS_BAR_COLORS[status] ?? "bg-muted"}`}
                style={{ width: `${widthPct}%` }}
                aria-label={`${EPIC_STATUS_LABELS[status] ?? status}: ${count}`}
              />
            </div>
            <span className="text-xs tabular-nums text-foreground w-6 text-right shrink-0">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
