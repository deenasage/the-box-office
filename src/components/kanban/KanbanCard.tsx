// SPEC: tickets.md
// SPEC: design-improvements.md
// SPEC: handoffs
"use client";

import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  KanbanTicket, TEAM_COLORS, SIZE_LABELS,
  COLUMNS, HUB_SHORT, getInitials, daysSince,
} from "./types";
import { PRIORITY_LABELS, PRIORITY_BADGE_STYLES } from "@/lib/constants";
import { Team } from "@prisma/client";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { TicketTypeBadge } from "@/components/tickets/TicketTypeBadge";
import { Clock, RotateCcw, AlertCircle, Hourglass } from "lucide-react";

const CYCLE_TIME_STATUSES = new Set(["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"]);

const CYCLE_TIME_LABELS: Record<string, string> = {
  BACKLOG:     "in backlog",
  IN_PROGRESS: "in progress",
  IN_REVIEW:   "in review",
  BLOCKED:     "blocked",
};

// ── Handoff badge colours keyed by team ──────────────────────────────────────
const HANDOFF_BADGE_STYLES: Record<Team, { label: string }> = {
  CONTENT:    { label: "CONTENT" },
  DESIGN:     { label: "DESIGN" },
  SEO:        { label: "SEO" },
  WEM:        { label: "WEM" },
  PAID_MEDIA: { label: "PAID MEDIA" },
  ANALYTICS:  { label: "ANALYTICS" },
};

// ── Cross-team blocked-by badge ───────────────────────────────────────────────
function CrossTeamBlockedByBadge({ ticket }: { ticket: KanbanTicket }) {
  const blockedBy = (ticket.crossTeamBlockedBy ?? []).filter((b) => b.team !== ticket.team);
  if (blockedBy.length === 0) return null;

  const primaryTeam = blockedBy[0].team;
  const extra = blockedBy.length - 1;
  const style = HANDOFF_BADGE_STYLES[primaryTeam];
  const totalCount = blockedBy.length;
  const tooltipText = `Waiting on ${totalCount} ${style.label} ticket${totalCount !== 1 ? "s" : ""} to be completed`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium text-slate-500 dark:text-slate-400 cursor-default"
          aria-label={tooltipText}
        >
          <Hourglass className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
          {style.label}
          {extra > 0 && <span>+{extra}</span>}
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Cross-team blocking badge ─────────────────────────────────────────────────
function CrossTeamBlockingBadge({ ticket }: { ticket: KanbanTicket }) {
  const blocking = ticket.crossTeamBlocking ?? [];
  const otherTeams = blocking.map((b) => b.team).filter((t) => t !== ticket.team);
  if (otherTeams.length === 0) return null;

  const primaryTeam = otherTeams[0];
  const extra = otherTeams.length - 1;
  const style = HANDOFF_BADGE_STYLES[primaryTeam];
  const totalCount = otherTeams.length;
  const tooltipText = `This ticket is blocking ${totalCount} ${style.label} ticket${totalCount !== 1 ? "s" : ""}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium text-slate-500 dark:text-slate-400 cursor-default"
          aria-label={tooltipText}
        >
          {/* Arrow-right rendered as a thin SVG so it stays at the same weight as Clock */}
          <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {style.label}
          {extra > 0 && <span>+{extra}</span>}
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface StatusMenuPosition { x: number; y: number }

// ── Status context menu ───────────────────────────────────────────────────────
function StatusContextMenu({
  position,
  currentStatus,
  onSelect,
  onClose,
}: {
  position: StatusMenuPosition;
  currentStatus: string;
  onSelect: (status: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
  const menuWidth = 160;
  const menuHeight = COLUMNS.length * 36 + 8;
  const left = Math.min(position.x, viewportWidth - menuWidth - 8);
  const top = Math.min(position.y, viewportHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Change ticket status"
      className="fixed z-50 w-40 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm"
      style={{ left, top }}
    >
      <p className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide select-none">
        Move to
      </p>
      {COLUMNS.map((col) => (
        <button
          key={col.status}
          role="menuitem"
          disabled={col.status === currentStatus}
          onClick={() => { onSelect(col.status); onClose(); }}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
            col.status === currentStatus
              ? "opacity-40 cursor-default"
              : "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
          )}
        >
          <span className={cn("h-2 w-2 rounded-full shrink-0", col.dotColor)} aria-hidden="true" />
          <span className={col.labelColor}>{col.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Assignee avatar ───────────────────────────────────────────────────────────
function AssigneeAvatar({ name }: { name: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="h-6 w-6 rounded-full bg-primary/15 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0 ring-1 ring-inset ring-primary/20 cursor-default"
          aria-label={`Assigned to ${name}`}
        >
          {getInitials(name)}
        </TooltipTrigger>
        <TooltipContent side="top">{name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── KanbanCard ────────────────────────────────────────────────────────────────
export function KanbanCard({
  ticket,
  onDragStart,
  onCardClick,
  onStatusChange,
}: {
  ticket: KanbanTicket;
  onDragStart: (id: string) => void;
  onCardClick: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}) {
  const isBlocked = ticket.status === "BLOCKED";

  const ageDate = ticket.status === "BACKLOG"
    ? ticket.createdAt
    : ticket.cycleStartedAt;
  const cycleAge = ageDate !== null ? daysSince(ageDate) : null;
  const showCycleTime = CYCLE_TIME_STATUSES.has(ticket.status) && cycleAge !== null && cycleAge > 1;

  const hasHandoffs =
    (ticket.crossTeamBlockedBy ?? []).filter((b) => b.team !== ticket.team).length > 0 ||
    (ticket.crossTeamBlocking ?? []).filter((b) => b.team !== ticket.team).length > 0;

  const [menuPos, setMenuPos] = useState<StatusMenuPosition | null>(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { title: ticket.title, status: ticket.status },
  });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!onStatusChange) return;
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, [onStatusChange]);

  const handleStatusSelect = useCallback((status: string) => {
    if (onStatusChange) onStatusChange(ticket.id, status);
  }, [onStatusChange, ticket.id]);

  const closeMenu = useCallback(() => setMenuPos(null), []);

  return (
    <>
      <div
        ref={setNodeRef}
        onClick={() => { if (!isDragging) onCardClick(ticket.id); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCardClick(ticket.id);
          }
        }}
        onContextMenu={handleContextMenu}
        className={cn(
          // Base
          "group relative bg-card border rounded-lg cursor-grab active:cursor-grabbing select-none",
          // Spacing
          "px-3 pt-2.5 pb-2.5",
          // Size constraints
          "min-w-0 w-full overflow-hidden",
          // Blocked state: red left accent border
          isBlocked
            ? "border-red-400/60 dark:border-red-500/50 border-l-[3px] border-l-red-500"
            : "border-border hover:border-primary/40",
          // Hover lift
          "hover:-translate-y-px hover:shadow-md",
          // Transitions
          "transition-[colors,transform,box-shadow] duration-150",
          // Focus ring for keyboard navigation
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
          isDragging && "opacity-0"
        )}
        aria-label={ticket.title}
        aria-grabbed={isDragging}
        suppressHydrationWarning
        {...listeners}
        {...attributes}
      >
        {/* ── Epic — muted label above title ── */}
        {ticket.epic && (
          <p className="text-[10px] text-muted-foreground truncate mb-1 leading-none" title={ticket.epic.name}>
            {ticket.epic.name}
          </p>
        )}

        {/* ── Title ── */}
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 break-words mb-2.5">
          {ticket.title}
        </p>

        {/* ── Tags row: type, team, priority, size, hub — all h-5 for uniform height ── */}
        <div className="flex flex-wrap gap-1 mb-3">
          {ticket.type && (
            <span className="inline-flex items-center justify-center h-5 w-5">
              <TicketTypeBadge type={ticket.type} variant="compact" />
            </span>
          )}
          {ticket.team && (
            <span className={cn("inline-flex items-center h-5 px-1.5 rounded text-[10px] font-semibold leading-none tracking-wide", TEAM_COLORS[ticket.team])}>
              {ticket.team}
            </span>
          )}
          {ticket.priority > 0 && (
            <span
              className={cn("inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium leading-none", PRIORITY_BADGE_STYLES[ticket.priority])}
              aria-label={`Priority: ${PRIORITY_LABELS[ticket.priority] ?? `Level ${ticket.priority}`}`}
            >
              {PRIORITY_LABELS[ticket.priority]}
            </span>
          )}
          {ticket.size && (
            <span className="inline-flex items-center h-5 px-1.5 rounded bg-muted text-muted-foreground text-[10px] font-mono leading-none">
              {SIZE_LABELS[ticket.size]}
            </span>
          )}
          {ticket.hub && (
            <span className="inline-flex items-center h-5 px-1.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20 text-[10px] font-medium leading-none">
              {HUB_SHORT[ticket.hub]}
            </span>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-border/60 mb-2" />

        {/* ── Footer: avatar + indicators left, handoffs + cycle right ── */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: assignee avatar + carryover + estimate */}
          <div className="flex items-center gap-1.5">
            {ticket.assignee
              ? <AssigneeAvatar name={ticket.assignee.name} />
              : <div className="h-6 w-6 rounded-full border border-dashed border-border/60" aria-hidden="true" />
            }
            {ticket.isCarryover && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    className="inline-flex items-center justify-center h-5 w-5 rounded text-amber-500 dark:text-amber-400 cursor-default"
                    aria-label="Carried over from previous sprint"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent side="top">Carried over from previous sprint</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {ticket.hasPendingEstimate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    className="inline-flex items-center justify-center h-5 w-5 rounded text-yellow-500 dark:text-yellow-400 cursor-default"
                    aria-label="Pending estimate"
                  >
                    <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent side="top">Estimate not yet confirmed</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Right: handoff badges + cycle time */}
          <div className="flex items-center gap-1">
            {hasHandoffs && (
              <>
                <CrossTeamBlockedByBadge ticket={ticket} />
                <CrossTeamBlockingBadge ticket={ticket} />
              </>
            )}
            {showCycleTime && cycleAge !== null && (
              <div className="flex items-center gap-0.5 text-muted-foreground/70">
                <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="text-[10px] leading-none tabular-nums">{cycleAge}d</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {menuPos && (
        <StatusContextMenu
          position={menuPos}
          currentStatus={ticket.status}
          onSelect={handleStatusSelect}
          onClose={closeMenu}
        />
      )}
    </>
  );
}
