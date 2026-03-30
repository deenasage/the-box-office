// SPEC: tickets.md
import Link from "next/link";
import { Team } from "@prisma/client";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TeamStat {
  team: Team;
  backlog: number;
  todo: number;
  ready: number;
  inProgress: number;
  inReview: number;
  blocked: number;
  doneThisSprint: number;
}

interface TeamStatsSectionProps {
  teamStats: TeamStat[];
}

interface StatRow {
  label: string;
  value: number;
  highlight?: "destructive" | "success";
}

function buildRows(stat: TeamStat): StatRow[] {
  return [
    { label: "Backlog",       value: stat.backlog },
    { label: "Prioritized",   value: stat.todo },
    { label: "To Do",         value: stat.ready },
    { label: "In Progress",   value: stat.inProgress },
    { label: "In Review",     value: stat.inReview },
    { label: "Blocked",       value: stat.blocked, highlight: stat.blocked > 0 ? "destructive" : undefined },
    { label: "Done this sprint", value: stat.doneThisSprint, highlight: "success" },
  ];
}

export function TeamStatsSection({ teamStats }: TeamStatsSectionProps) {
  if (teamStats.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Teams</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teamStats.map((stat) => {
          const rows = buildRows(stat);

          return (
            <Link key={stat.team} href={`/tickets?team=${stat.team}`} className="group hover:no-underline">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader className="pb-2 pt-4 px-4">
                  <TeamBadge team={stat.team} />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <dl className="space-y-1 text-sm">
                    {rows.map(({ label, value, highlight }) => {
                      const isDivider = label === "Done this sprint";
                      return (
                        <div
                          key={label}
                          className={`flex justify-between${isDivider ? " border-t pt-1 mt-1" : ""}`}
                        >
                          <dt
                            className={
                              highlight === "destructive"
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {label}
                          </dt>
                          <dd
                            className={`font-medium tabular-nums ${
                              highlight === "destructive"
                                ? "text-destructive"
                                : highlight === "success"
                                ? "text-green-600 dark:text-green-400"
                                : ""
                            }`}
                          >
                            {value}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
