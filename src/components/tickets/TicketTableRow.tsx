// SPEC: tickets.md
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TicketSummary } from "@/types";
import { SizeBadge } from "./SizeBadge";
import { TeamBadge } from "./TeamBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/utils";
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_BADGE_STYLES } from "@/lib/constants";
import { TicketStatus } from "@prisma/client";

const STATUS_DOT: Record<TicketStatus, string> = {
  BACKLOG:     "bg-muted-foreground/40",
  TODO:        "bg-blue-400",
  READY:       "bg-sky-400",
  IN_PROGRESS: "bg-violet-400",
  IN_REVIEW:   "bg-amber-400",
  BLOCKED:     "bg-orange-500",
  DONE:        "bg-[#008146]",
};


/**
 * Returns Tailwind classes for the row's left-border accent and optional background tint.
 * Rules checked in priority order:
 *  1. BLOCKED  → red left border + very subtle red tint
 *  2. High priority (>= 3) and not DONE → amber left border
 *  3. DONE     → green left border (subtle)
 *  4. default  → standard bottom border only
 */
function getRowAccent(ticket: TicketSummary): string {
  if (ticket.status === "BLOCKED") {
    return "border-l-4 border-l-red-500 bg-red-500/[0.03]";
  }
  if (ticket.priority >= 4 && ticket.status !== "DONE") {
    return "border-l-4 border-l-amber-500";
  }
  if (ticket.status === "DONE") {
    return "border-l-4 border-l-green-500";
  }
  return "border-l-4 border-l-transparent";
}

interface TicketTableRowProps {
  ticket: TicketSummary;
  isSelected: boolean;
  onToggle: (id: string, checked: boolean) => void;
}

export function TicketTableRow({ ticket, isSelected, onToggle }: TicketTableRowProps) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/tickets/${ticket.id}`)}
      className={`border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${getRowAccent(ticket)} ${
        isSelected ? "bg-muted/40" : ""
      }`}
    >
      {/* Row checkbox — stop propagation so clicking it doesn't navigate */}
      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(v) => onToggle(ticket.id, v === true)}
          aria-label={`Select ticket: ${ticket.title}`}
        />
      </td>

      <td className="px-4 py-3 max-w-[260px]">
        <div className="flex items-center gap-2">
          <TeamBadge team={ticket.team} />
          <Link
            href={`/tickets/${ticket.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium line-clamp-1 hover:underline"
          >
            {ticket.title}
          </Link>
        </div>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[ticket.status]}`} />
          {STATUS_LABELS[ticket.status]}
        </span>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        {ticket.priority > 0 ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_BADGE_STYLES[ticket.priority]}`}>
            {PRIORITY_LABELS[ticket.priority]}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      <td className="px-4 py-3">
        <SizeBadge size={ticket.size} />
      </td>

      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {ticket.assignee?.name ?? "—"}
      </td>

      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {ticket.sprint?.name ?? "—"}
      </td>

      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {ticket.epic?.name ?? "—"}
      </td>

      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {ticket.createdAt ? formatDate(ticket.createdAt) : "—"}
      </td>
    </tr>
  );
}
