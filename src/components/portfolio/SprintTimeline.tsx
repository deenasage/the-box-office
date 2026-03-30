// SPEC: portfolio-view.md
import { Badge } from "@/components/ui/badge";
import { PortfolioDetailTeamGroup } from "./portfolio-types";

interface SprintTimelineProps {
  ticketsByTeam: PortfolioDetailTeamGroup[];
}

interface SprintRollup {
  sprintId: string;
  sprintName: string;
  total: number;
  done: number;
}

function buildSprintRollup(ticketsByTeam: PortfolioDetailTeamGroup[]): SprintRollup[] {
  const map = new Map<string, SprintRollup>();

  for (const group of ticketsByTeam) {
    for (const ticket of group.tickets) {
      if (!ticket.sprintId || !ticket.sprintName) continue;
      const existing = map.get(ticket.sprintId) ?? {
        sprintId: ticket.sprintId,
        sprintName: ticket.sprintName,
        total: 0,
        done: 0,
      };
      existing.total += 1;
      if (ticket.status === "DONE") existing.done += 1;
      map.set(ticket.sprintId, existing);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.sprintName.localeCompare(b.sprintName));
}

export function SprintTimeline({ ticketsByTeam }: SprintTimelineProps) {
  const rollup = buildSprintRollup(ticketsByTeam);

  if (rollup.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
        No sprint assignments yet.
      </p>
    );
  }

  return (
    <div className="divide-y border rounded-lg overflow-hidden">
      {rollup.map((sprint) => {
        const pct = sprint.total > 0 ? Math.round((sprint.done / sprint.total) * 100) : 0;
        return (
          <div key={sprint.sprintId} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <Badge variant="secondary" className="text-xs font-normal shrink-0">{sprint.sprintName}</Badge>
              <span className="text-xs text-muted-foreground">
                {sprint.done}/{sprint.total} tickets done
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-24 bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
