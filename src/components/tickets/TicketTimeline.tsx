// SPEC: tickets.md
"use client";

import { cn } from "@/lib/utils";
import { TicketStatus } from "@prisma/client";
import { STATUS_LABELS, STATUS_BADGE_STYLES } from "@/lib/constants";

export interface TimelineEntry {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  changedAt: string; // ISO string
  changedBy: { name: string };
}

const STATUS_DOT: Record<TicketStatus, string> = {
  BACKLOG:     "bg-slate-400",
  TODO:        "bg-blue-400",
  READY:       "bg-sky-400",
  IN_PROGRESS: "bg-violet-500",
  IN_REVIEW:   "bg-purple-500",
  BLOCKED:     "bg-red-500",
  DONE:        "bg-green-500",
};

// Status column order for the summary cards
const STATUS_ORDER: TicketStatus[] = [
  "BACKLOG", "TODO", "READY", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE",
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function elapsedMs(ms: number): string {
  const mins  = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins > 0)  return `${mins}m`;
  return "< 1m";
}

function elapsedBetween(from: string, to: string): string {
  return elapsedMs(new Date(to).getTime() - new Date(from).getTime());
}

interface TicketTimelineProps {
  entries: TimelineEntry[];
  createdAt: string;
}

export function TicketTimeline({ entries, createdAt }: TicketTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No status changes recorded yet.
      </p>
    );
  }

  // ── Aggregate total time per status ───────────────────────────────────────
  // entries[i].toStatus was active from entries[i].changedAt until entries[i+1].changedAt
  // (or now if it's the last/current status).
  const now = new Date().toISOString();
  const totalMsByStatus: Partial<Record<TicketStatus, number>> = {};

  for (let i = 0; i < entries.length; i++) {
    const status = entries[i].toStatus;
    const start  = entries[i].changedAt;
    const end    = entries[i + 1]?.changedAt ?? now;
    const ms     = new Date(end).getTime() - new Date(start).getTime();
    totalMsByStatus[status] = (totalMsByStatus[status] ?? 0) + ms;
  }

  const summaryItems = STATUS_ORDER.filter((s) => (totalMsByStatus[s] ?? 0) > 0);

  // ── Build timeline display events ─────────────────────────────────────────
  // entries[0] has fromStatus=null — this is ticket creation.
  // For each entry i > 0, show elapsed since previous entry.
  const events = entries.map((e, i) => ({
    ...e,
    elapsed: i === 0 ? null : elapsedBetween(entries[i - 1].changedAt, e.changedAt),
  }));

  return (
    <div className="space-y-5">
      {/* ── Summary cards ── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Total time per status
        </p>
        <div className="flex flex-wrap gap-2">
          {summaryItems.map((status) => {
            const ms = totalMsByStatus[status] ?? 0;
            const isActive = entries[entries.length - 1].toStatus === status;
            return (
              <div
                key={status}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                  STATUS_BADGE_STYLES[status]
                )}
              >
                <span
                  className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[status])}
                  aria-hidden="true"
                />
                <span className="font-medium">{STATUS_LABELS[status]}</span>
                <span className="opacity-70">{elapsedMs(ms)}</span>
                {isActive && (
                  <span className="text-[10px] opacity-60 italic">ongoing</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-border" />

      {/* ── Detailed timeline ── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Status history
        </p>
        <ol className="relative border-l border-border ml-3 space-y-0">
          {events.map((ev, idx) => (
            <li key={ev.id} className="relative pl-6 pb-6 last:pb-0">
              <span
                className={cn(
                  "absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background",
                  STATUS_DOT[ev.toStatus]
                )}
                aria-hidden="true"
              />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                      STATUS_BADGE_STYLES[ev.toStatus]
                    )}
                  >
                    {idx === 0 ? "Created" : STATUS_LABELS[ev.toStatus]}
                  </span>
                  {ev.elapsed && (
                    <span className="text-[11px] text-muted-foreground">
                      after {ev.elapsed} in {STATUS_LABELS[ev.fromStatus!]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <time dateTime={ev.changedAt}>{formatDateTime(ev.changedAt)}</time>
                  {idx > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>by {ev.changedBy.name}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
