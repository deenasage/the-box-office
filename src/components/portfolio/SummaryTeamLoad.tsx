// SPEC: portfolio-view.md
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { Team } from "@prisma/client";

interface SummaryTeamLoadProps {
  teamLoad: { team: string; capacity: number; committed: number }[];
}

export function SummaryTeamLoad({ teamLoad }: SummaryTeamLoadProps) {
  if (teamLoad.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No capacity data for active sprint.</p>;
  }

  return (
    <div className="space-y-4">
      {teamLoad.map(({ team, capacity, committed }) => {
        const loadPct = capacity > 0 ? Math.round((committed / capacity) * 100) : 0;
        const committedPct = capacity > 0 ? Math.min(Math.round((committed / capacity) * 100), 100) : 0;
        const isOver = loadPct > 100;

        return (
          <div key={team} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <TeamBadge team={team as Team} />
              <span className={`text-xs tabular-nums font-medium ${isOver ? "text-red-600" : loadPct > 80 ? "text-amber-600" : "text-muted-foreground"}`}>
                {committed}/{capacity}pt · {loadPct}%
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOver ? "bg-red-400" : "bg-primary"}`}
                style={{ width: `${committedPct}%` }}
                role="progressbar"
                aria-valuenow={loadPct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
