// SPEC: tickets.md
// SPEC: design-improvements.md
"use client";

import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  KanbanTicket, TEAM_COLORS, PRIORITY_COLORS, SIZE_LABELS,
  COLUMNS, HUB_SHORT, getInitials, daysSince,
} from "./types";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";

const PRIORITY_LABELS: Record<number, string> = {
  0: "No priority",
  1: "Low",
  2: "Medium",
  3: "High",
};

const CYCLE_TIME_STATUSES = new Set(["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"]);

const CYCLE_TIME_LABELS: Record<string, string> = {
  BACKLOG:     "in backlog",
  IN_PROGRESS: "in progress",
  IN_REVIEW:   "in review",
  BLOCKED:     "blocked",
};

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

  // Clamp to viewport so menu never renders off-screen
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
  // BACKLOG age is measured from ticket creation; other active statuses use cycleStartedAt
  const ageDate = ticket.status === "BACKLOG"
    ? ticket.createdAt
    : ticket.cycleStartedAt;
  const cycleAge = ageDate !== null ? daysSince(ageDate) : null;
  const showCycleTime = CYCLE_TIME_STATUSES.has(ticket.status) && cycleAge !== null && cycleAge > 1;

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
          if (e.key === "Enter") onCardClick(ticket.id);
        }}
        onContextMenu={handleContextMenu}
        className={cn(
          "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing select-none hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-sm transition-[colors,transform,box-shadow] duration-150 min-w-0 w-full overflow-hidden min-h-20",
          isDragging && "opacity-0"
        )}
        aria-label={ticket.title}
        aria-grabbed={isDragging}
        {...listeners}
        {...attributes}
      >
        {ticket.epic && (
          <div
            className="text-[10px] font-medium mb-1.5 px-1.5 py-0.5 rounded inline-block max-w-full truncate"
            style={{ backgroundColor: `${ticket.epic.color ?? "#6366f1"}22`, color: ticket.epic.color ?? "#6366f1" }}
          >
            {ticket.epic.name}
          </div>
        )}
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 wrap-break-word">
          {ticket.title}
        </p>
        {showCycleTime && cycleAge !== null && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {cycleAge}d {CYCLE_TIME_LABELS[ticket.status] ?? ticket.status.toLowerCase()}
          </p>
        )}
        <div className="flex items-center justify-between mt-2 gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex items-center"
                  aria-label={`Priority: ${PRIORITY_LABELS[ticket.priority] ?? `Level ${ticket.priority}`}`}
                >
                  <span
                    className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_COLORS[ticket.priority] ?? "bg-slate-400")}
                    aria-hidden="true"
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  {PRIORITY_LABELS[ticket.priority] ?? `Priority ${ticket.priority}`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {ticket.team && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", TEAM_COLORS[ticket.team])}>
                {ticket.team}
              </span>
            )}
            {ticket.size && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {SIZE_LABELS[ticket.size]}
              </span>
            )}
            {ticket.hub && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20 font-medium">
                {HUB_SHORT[ticket.hub]}
              </span>
            )}
          </div>
          {ticket.assignee && (
            <div
              className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center shrink-0"
              title={ticket.assignee.name}
            >
              {getInitials(ticket.assignee.name)}
            </div>
          )}
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
