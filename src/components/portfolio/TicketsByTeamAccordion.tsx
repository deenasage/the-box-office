// SPEC: design-improvements.md
// SPEC: portfolio-view.md
"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { SizeBadge } from "@/components/tickets/SizeBadge";
import { PortfolioDetailTeamGroup } from "./portfolio-types";
import { Team, TicketSize, TicketStatus } from "@prisma/client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";

const TICKET_STATUS_STYLES: Record<string, string> = {
  BACKLOG:     "bg-muted text-muted-foreground border-border",
  TODO:        "bg-sky-50 text-sky-700 border-sky-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  IN_REVIEW:   "bg-violet-50 text-violet-700 border-violet-200",
  DONE:        "bg-[#008146]/10 text-[#008146] border-[#008146]/30",
};

interface TicketsByTeamAccordionProps {
  ticketsByTeam: PortfolioDetailTeamGroup[];
}

export function TicketsByTeamAccordion({ ticketsByTeam }: TicketsByTeamAccordionProps) {
  if (ticketsByTeam.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
        No tickets assigned to this initiative yet.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {ticketsByTeam.map((group) => (
        <TeamSection key={group.team} group={group} />
      ))}
    </div>
  );
}

function TeamSection({ group }: { group: PortfolioDetailTeamGroup }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <TeamBadge team={group.team as Team} />
          <span className="text-sm text-muted-foreground">
            {group.tickets.length} ticket{group.tickets.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            {group.committedPoints}pt committed · {group.completedPoints}pt done
          </span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/10">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Size</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Sprint</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {group.tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-2 max-w-[240px]">
                    <Link href={`/tickets/${ticket.id}`} className="hover:underline font-medium line-clamp-1">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <Badge variant="outline" className={`text-xs ${TICKET_STATUS_STYLES[ticket.status] ?? ""}`}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <SizeBadge size={ticket.size as TicketSize | null} />
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {ticket.sprintName ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {ticket.assigneeName ?? "Unassigned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
