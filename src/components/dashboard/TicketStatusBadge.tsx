// SPEC: design-improvements.md
// SPEC: tickets.md
import type { TicketStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/constants";

// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
const STATUS_STYLES: Record<TicketStatus, string> = {
  BACKLOG:     "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  TODO:        "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20",
  READY:       "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20",
  IN_PROGRESS: "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20",
  IN_REVIEW:   "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20",
  BLOCKED:     "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20",
  DONE:        "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20",
  CANCELLED:   "bg-slate-500/10 text-slate-500 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
} as Record<TicketStatus, string>;

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}
