// SPEC: tickets.md
// SPEC: design-improvements.md
"use client";

import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { TicketStatus } from "@prisma/client";
import { KanbanTicket, COLUMNS } from "./types";
import { KanbanCard } from "./KanbanCard";
import { Inbox } from "lucide-react";

type ColumnConfig = typeof COLUMNS[number];

export function KanbanColumn({
  config, tickets, isOver: isOverProp, onDragOver, onDrop, onDragStart, onCardClick, onStatusChange,
}: {
  config: ColumnConfig;
  tickets: KanbanTicket[];
  isOver: boolean;
  onDragOver: () => void;
  onDrop: () => void;
  onDragStart: (id: string) => void;
  onCardClick: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}) {
  const { setNodeRef, isOver: isDndOver } = useDroppable({ id: config.status });
  const isOver = isOverProp || isDndOver;

  const overWip = config.wipLimit !== null && tickets.length > config.wipLimit;
  const atWip = config.wipLimit !== null && tickets.length === config.wipLimit;
  const blockedCount =
    config.status !== "BLOCKED" ? tickets.filter((t) => t.status === "BLOCKED").length : 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col flex-1 min-w-0 rounded-xl border-t-4 bg-card/50 overflow-hidden",
        config.color,
        isOver && "ring-2 ring-primary/40"
      )}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      role="group"
      aria-label={`${config.label} column, ${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}`}
    >
      <div className={cn("flex items-center justify-between px-3 py-2.5 border-b border-border/50 overflow-hidden", config.headerBg)}>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span className={cn("h-2 w-2 rounded-full shrink-0", config.dotColor)} aria-hidden="true" />
          <span className={cn("text-sm font-semibold truncate", config.labelColor)}>{config.label}</span>
          <span className={cn(
            "text-xs font-mono px-1.5 py-0.5 rounded-full ring-1 ring-inset",
            overWip ? "bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20"
              : atWip ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20"
              : "bg-muted text-muted-foreground ring-border/50"
          )}>
            {tickets.length}
          </span>
          {blockedCount > 0 && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20">
              {blockedCount} blocked
            </span>
          )}
        </div>
        {overWip && <span className="text-[10px] text-red-700 dark:text-red-400 font-medium shrink-0">WIP exceeded</span>}
      </div>
      <div className={cn("flex flex-col gap-2 p-2 flex-1 min-h-0 overflow-y-auto transition-colors", isOver && "bg-primary/5")}>
        {tickets.map((t) => (
          <KanbanCard key={t.id} ticket={t} onDragStart={onDragStart} onCardClick={onCardClick} onStatusChange={onStatusChange} />
        ))}
        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-6 border border-dashed border-border/40 rounded-lg">
            <div className="rounded-full bg-muted p-2 w-fit">
              <Inbox className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-xs text-muted-foreground">No tickets</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Swimlane row ────────────────────────────────────────────────────────────────
export function SwimlaneRow({
  label, tickets, columns, dragOverStatus, onDragOver, onDrop, onDragStart, onCardClick, onStatusChange,
}: {
  label: string;
  tickets: KanbanTicket[];
  columns: ColumnConfig[];
  dragOverStatus: TicketStatus | null;
  onDragOver: (s: TicketStatus) => void;
  onDrop: (s: TicketStatus) => void;
  onDragStart: (id: string) => void;
  onCardClick: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {tickets.length}
        </span>
        <div className="flex-1 border-t border-border/40" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            config={col}
            tickets={tickets.filter((t) => t.status === col.status)}
            isOver={dragOverStatus === col.status}
            onDragOver={() => onDragOver(col.status)}
            onDrop={() => onDrop(col.status)}
            onDragStart={onDragStart}
            onCardClick={onCardClick}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
}
