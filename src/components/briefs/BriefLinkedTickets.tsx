// SPEC: ai-brief.md
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket } from "lucide-react";
import { TEAM_LABELS, TEAM_BADGE_COLORS } from "@/lib/constants";
import { SIZE_HOURS } from "@/lib/utils";
import { TicketSize, Team } from "@prisma/client";

interface BriefTicket {
  id: string;
  title: string;
  team: string;
  status: string;
  size?: string | null;
}

interface BriefLinkedTicketsProps {
  tickets: BriefTicket[];
  epicId?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  BACKLOG:     "bg-muted text-muted-foreground border-border",
  TODO:        "bg-[#008146]/10 text-[#008146] border-[#008146]/30",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  IN_REVIEW:   "bg-violet-50 text-violet-700 border-violet-200",
  BLOCKED:     "bg-red-50 text-red-700 border-red-200",
  DONE:        "bg-[#008146]/10 text-[#008146] border-[#008146]/30",
};

const STATUS_LABELS: Record<string, string> = {
  BACKLOG:     "Backlog",
  TODO:        "Prioritized",
  IN_PROGRESS: "In Progress",
  IN_REVIEW:   "In Review",
  BLOCKED:     "Blocked",
  DONE:        "Done",
};

function ticketHours(size: string | null | undefined): number {
  if (!size) return 0;
  return SIZE_HOURS[size as TicketSize] ?? 0;
}

export function BriefLinkedTickets({ tickets, epicId }: BriefLinkedTicketsProps) {
  if (tickets.length === 0) return null;

  // Group by team
  const teamMap = new Map<string, BriefTicket[]>();
  for (const ticket of tickets) {
    const group = teamMap.get(ticket.team) ?? [];
    group.push(ticket);
    teamMap.set(ticket.team, group);
  }

  const doneCount = tickets.filter((t) => t.status === "DONE").length;
  const totalHours = tickets.reduce((sum, t) => sum + ticketHours(t.size), 0);

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Ticket className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Generated Tickets ({tickets.length})
        </h2>
        {epicId && (
          <Link
            href={`/epics/${epicId}/dependencies`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View dependency graph →
          </Link>
        )}
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="font-normal">
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline" className="font-normal bg-[#008146]/10 text-[#008146] border-[#008146]/30">
          {doneCount} done
        </Badge>
        {totalHours > 0 && (
          <Badge variant="outline" className="font-normal">
            ~{totalHours}h estimated
          </Badge>
        )}
      </div>

      {/* Per-team cards */}
      <div className="space-y-3">
        {Array.from(teamMap.entries()).map(([team, teamTickets]) => {
          const teamDone = teamTickets.filter((t) => t.status === "DONE").length;
          const teamHours = teamTickets.reduce((sum, t) => sum + ticketHours(t.size), 0);
          const teamLabel = TEAM_LABELS[team as Team] ?? team;
          const teamBadgeClass = TEAM_BADGE_COLORS[team as Team] ?? "text-muted-foreground border-border bg-muted";

          return (
            <Card key={team}>
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center justify-between gap-2 flex-wrap text-sm">
                  <Badge variant="outline" className={teamBadgeClass}>
                    {teamLabel}
                  </Badge>
                  <span className="text-xs font-normal text-muted-foreground">
                    {teamTickets.length} ticket{teamTickets.length !== 1 ? "s" : ""}
                    {" · "}
                    {teamDone} done
                    {teamHours > 0 && ` · ~${teamHours}h`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-0">
                <div className="divide-y">
                  {teamTickets.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tickets/${t.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-sm"
                    >
                      <span className="flex-1 font-medium line-clamp-1">{t.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${STATUS_STYLES[t.status] ?? ""}`}
                      >
                        {STATUS_LABELS[t.status] ?? t.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
