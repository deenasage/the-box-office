// SPEC: sprints.md
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface StatusSegment {
  status: string;
  count: number;
  label: string;
}

interface SprintBatteryWidgetProps {
  sprintName: string;
  statusCounts: StatusSegment[];
  total: number;
}

const STATUS_BAR_COLOR: Record<string, string> = {
  BACKLOG:     "bg-slate-300 dark:bg-slate-600",
  TODO:        "bg-blue-400",
  READY:       "bg-sky-400",
  IN_PROGRESS: "bg-violet-500",
  IN_REVIEW:   "bg-amber-400",
  BLOCKED:     "bg-red-500",
  DONE:        "bg-[#008146]",
};

const STATUS_DOT_COLOR: Record<string, string> = {
  BACKLOG:     "bg-slate-300 dark:bg-slate-600",
  TODO:        "bg-blue-400",
  READY:       "bg-sky-400",
  IN_PROGRESS: "bg-violet-500",
  IN_REVIEW:   "bg-amber-400",
  BLOCKED:     "bg-red-500",
  DONE:        "bg-[#008146]",
};

export function SprintBatteryWidget({ sprintName, statusCounts, total }: SprintBatteryWidgetProps) {
  // Only show statuses that have at least one ticket
  const nonEmpty = statusCounts.filter((s) => s.count > 0);

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Sprint Health — {sprintName}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {/* Stacked bar */}
        <div
          className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="img"
          aria-label={`Sprint battery: ${total} total tickets`}
        >
          {nonEmpty.map((seg) => {
            const pct = total > 0 ? (seg.count / total) * 100 : 0;
            return (
              <div
                key={seg.status}
                className={STATUS_BAR_COLOR[seg.status] ?? "bg-slate-400"}
                style={{ width: `${pct}%` }}
                title={`${seg.label}: ${seg.count}`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {statusCounts.map((seg) => (
            <div key={seg.status} className="flex items-center gap-1.5 min-w-0">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_COLOR[seg.status] ?? "bg-slate-400"}`}
                aria-hidden="true"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {seg.label}
                <span className="ml-1 font-semibold text-foreground">{seg.count}</span>
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-xs font-semibold text-foreground">{total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
