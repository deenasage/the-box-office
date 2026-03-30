// SPEC: auto-assign-v2.md
// SPEC: design-improvements.md
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { SizeBadge } from "@/components/tickets/SizeBadge";
import { SkippedTicket } from "./auto-assign-types";

interface SkippedTicketsListProps {
  skippedTickets: SkippedTicket[];
}

const REASON_LABELS: Record<SkippedTicket["reason"], string> = {
  NO_SIZE: "Unsized",
  BLOCKED: "Blocked",
  NO_ASSIGNEE_AVAILABLE: "No assignee available",
};

// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
const REASON_STYLES: Record<SkippedTicket["reason"], string> = {
  NO_SIZE:               "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  BLOCKED:               "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20",
  NO_ASSIGNEE_AVAILABLE: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20",
};

export function SkippedTicketsList({ skippedTickets }: SkippedTicketsListProps) {
  const [expanded, setExpanded] = useState(false);

  if (skippedTickets.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between px-4 py-2.5 h-auto rounded-none text-sm font-medium hover:bg-muted/50"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="skipped-tickets-list"
      >
        <span>
          {expanded ? "Hide" : "Show"} {skippedTickets.length} skipped
          ticket{skippedTickets.length !== 1 ? "s" : ""}
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </Button>

      {expanded && (
        <div
          id="skipped-tickets-list"
          className="divide-y border-t"
        >
          {skippedTickets.map((ticket) => (
            <div key={ticket.id} className="px-4 py-2.5 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="text-sm truncate"
                    title={ticket.title}
                  >
                    {ticket.title}
                  </span>
                  {ticket.reason === "NO_SIZE" && (
                    <a
                      href={`/tickets/${ticket.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-0.5 text-xs text-primary hover:underline underline-offset-2"
                      aria-label={`Go to ticket: ${ticket.title}`}
                    >
                      Go to ticket
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
                <span
                  className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded ${REASON_STYLES[ticket.reason]}`}
                >
                  {REASON_LABELS[ticket.reason]}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <TeamBadge team={ticket.team} className="text-[10px] px-1.5 py-0" />
                <SizeBadge size={ticket.size} />
              </div>

              {ticket.reason === "BLOCKED" && ticket.blockedByTicketTitle && (
                <p className="text-xs text-muted-foreground">
                  Blocked by:{" "}
                  {ticket.blockedByTicketId ? (
                    <a
                      href={`/tickets/${ticket.blockedByTicketId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:underline underline-offset-2"
                    >
                      {ticket.blockedByTicketTitle}
                    </a>
                  ) : (
                    ticket.blockedByTicketTitle
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
