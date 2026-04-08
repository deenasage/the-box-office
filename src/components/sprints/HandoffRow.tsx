// SPEC: handoffs
"use client";

import { ArrowRight, Inbox } from "lucide-react";
import { TicketStatus, Team } from "@prisma/client";
import { cn } from "@/lib/utils";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { TicketStatusBadge } from "@/components/dashboard/TicketStatusBadge";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TicketRef {
  id: string;
  title: string;
  status: TicketStatus;
  team: Team;
  sprint: { id: string; name: string; startDate: string } | null;
}

export interface HandoffDependency {
  id: string;
  blocker: TicketRef;
  dependent: TicketRef;
  sequencing: "correct" | "same-sprint" | "inverted" | "unscheduled";
}

// ── Sequencing colours ────────────────────────────────────────────────────────

export const SEQUENCING_BORDER: Record<HandoffDependency["sequencing"], string> = {
  correct:       "border-l-emerald-500",
  "same-sprint": "border-l-amber-500",
  inverted:      "border-l-red-500",
  unscheduled:   "border-l-slate-400",
};

const SEQUENCING_SR_LABEL: Record<HandoffDependency["sequencing"], string> = {
  correct:       "Correct order",
  "same-sprint": "Same sprint",
  inverted:      "Inverted order",
  unscheduled:   "Not yet scheduled",
};

// ── TicketSide ────────────────────────────────────────────────────────────────

function TicketSide({ ticket }: { ticket: TicketRef }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
      <TeamBadge team={ticket.team} className="shrink-0" />
      <span className="text-sm font-medium text-foreground truncate max-w-[180px]" title={ticket.title}>
        {ticket.title}
      </span>
      <TicketStatusBadge status={ticket.status} />
      <span className="text-xs text-muted-foreground shrink-0">
        {ticket.sprint ? ticket.sprint.name : "No sprint"}
      </span>
    </div>
  );
}

// ── HandoffRow ────────────────────────────────────────────────────────────────

export function HandoffRow({ handoff }: { handoff: HandoffDependency }) {
  const borderColour = SEQUENCING_BORDER[handoff.sequencing];
  const srLabel = SEQUENCING_SR_LABEL[handoff.sequencing];

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-l-4",
        "bg-card rounded-r-md",
        borderColour
      )}
      role="listitem"
    >
      <TicketSide ticket={handoff.blocker} />
      <div className="flex items-center gap-1 text-muted-foreground shrink-0 sm:px-2" aria-hidden="true">
        <ArrowRight className="h-4 w-4" />
        <span className="text-xs sr-only">{srLabel}: blocks</span>
        <span className="text-xs hidden sm:inline">blocks</span>
      </div>
      <TicketSide ticket={handoff.dependent} />
    </div>
  );
}

// ── EmptyHandoffs ─────────────────────────────────────────────────────────────

export function EmptyHandoffs() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center" role="status" aria-label="No handoffs">
      <Inbox className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">No cross-team handoffs in this sprint</p>
    </div>
  );
}
