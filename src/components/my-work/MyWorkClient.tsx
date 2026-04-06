// SPEC: my-work.md
// SPEC: design-improvements.md
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TicketStatus, TicketSize, Team } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SizeBadge } from "@/components/tickets/SizeBadge";
import { TicketStatusBadge } from "@/components/dashboard/TicketStatusBadge";
import { DueDatePill } from "@/components/dashboard/DueDatePill";
import { STATUS_LABELS, PRIORITY_DOT_COLORS_NUMERIC as PRIORITY_DOT } from "@/lib/constants";
import { CheckCircle2, LayoutGrid, List, Inbox, CalendarClock, ChevronUp, ChevronDown, CalendarDays } from "lucide-react";
import { cn, SIZE_HOURS, businessDaysBetween } from "@/lib/utils";
import { KanbanTicketPanel } from "@/components/kanban/KanbanTicketPanel";
import { notify } from "@/lib/toast";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Input } from "@/components/ui/input";
import type { MyWorkTab, UserCapacityDefaults, ActiveSprintInfo, SerializedWorkTicket } from "@/app/(app)/my-work/page";

// ── Types ──────────────────────────────────────────────────────────────────────

type WorkTicket = SerializedWorkTicket;

interface DeadlineTicket {
  id: string;
  title: string;
  dueDate: string | null;
  status: TicketStatus;
  team: Team;
  size: TicketSize | null;
  sprint: { id: string; name: string } | null;
}

interface MyWorkClientProps {
  activeTab: MyWorkTab;
  openTickets: WorkTicket[];
  recentDone: WorkTicket[];
  totalHours: number;
  upcomingDeadlines: DeadlineTicket[];
  capacityDefaults: UserCapacityDefaults;
  activeSprint: ActiveSprintInfo | null;
}

type ViewMode = "kanban" | "list";

const STATUS_ORDER: TicketStatus[] = [
  "BACKLOG",
  "TODO",
  "READY",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
];

const COLUMN_CONFIG: Record<TicketStatus, { label: string; color: string; headerColor: string }> = {
  BACKLOG: {
    label: "Backlog",
    color: "border-slate-500",
    headerColor: "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  },
  TODO: {
    label: "Prioritized",
    color: "border-blue-500",
    headerColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20",
  },
  READY: {
    label: "To Do",
    color: "border-sky-500",
    headerColor: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "border-yellow-500",
    headerColor: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 ring-1 ring-inset ring-yellow-500/20",
  },
  IN_REVIEW: {
    label: "In Review",
    color: "border-purple-500",
    headerColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-500/20",
  },
  BLOCKED: {
    label: "Blocked",
    color: "border-red-500",
    headerColor: "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20",
  },
  DONE: {
    label: "Done",
    color: "border-green-500",
    headerColor: "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20",
  },
};

const STATUS_HEADER: Record<TicketStatus, string> = {
  BACKLOG:     "bg-muted border-border text-muted-foreground",
  TODO:        "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300",
  READY:       "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300",
  IN_PROGRESS: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300",
  IN_REVIEW:   "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
  BLOCKED:     "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300",
  DONE:        "bg-[#008146]/10 border-[#008146]/30 text-[#008146] dark:bg-[#00D93A]/15 dark:border-[#00D93A]/30 dark:text-[#00D93A]",
};

// ── Age helpers ───────────────────────────────────────────────────────────────

const AGE_STATUSES = new Set<TicketStatus>(["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"]);

const AGE_LABELS: Partial<Record<TicketStatus, string>> = {
  BACKLOG:     "in backlog",
  IN_PROGRESS: "in progress",
  IN_REVIEW:   "in review",
  BLOCKED:     "blocked",
};

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function ticketAge(ticket: WorkTicket): number | null {
  if (!AGE_STATUSES.has(ticket.status)) return null;
  const anchor = ticket.status === "BACKLOG" ? ticket.createdAt : ticket.cycleStartedAt;
  if (!anchor) return null;
  return daysSince(anchor);
}

// ── Kanban sub-components ──────────────────────────────────────────────────────

function KanbanCard({ ticket, onSelect }: { ticket: WorkTicket; onSelect: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { status: ticket.status },
  });

  const age = ticketAge(ticket);
  const showAge = age !== null && age > 1;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => { if (!isDragging) onSelect(ticket.id); }}
      className={cn(
        "bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors min-h-20 cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-0"
      )}
    >
      {ticket.epic && (
        <p className="text-[10px] font-medium mb-1.5 truncate text-muted-foreground">
          {ticket.epic.name}
        </p>
      )}
      <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
        {ticket.title}
      </p>
      {showAge && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {age}d {AGE_LABELS[ticket.status]}
        </p>
      )}
      <div className="flex items-center justify-between mt-2 gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ticket.priority > 0 && (
            <span
              className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_DOT[ticket.priority] ?? "bg-slate-400")}
              aria-label={`Priority ${ticket.priority}`}
            />
          )}
          {ticket.team && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {ticket.team}
            </span>
          )}
        </div>
        <SizeBadge size={ticket.size} />
      </div>
      {ticket.sprint && (
        <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{ticket.sprint.name}</p>
      )}
    </div>
  );
}

function DroppableColumn({
  status,
  tickets,
  onSelect,
}: {
  status: TicketStatus;
  tickets: WorkTicket[];
  onSelect: (id: string) => void;
}) {
  const col = COLUMN_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className={cn("flex flex-col flex-1 min-w-0 rounded-xl border-t-4 bg-card/50", col.color, isOver && "ring-2 ring-primary/40")}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
        <span className="text-sm font-semibold truncate">{col.label}</span>
        <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded-full", col.headerColor)}>
          {tickets.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn("flex flex-col gap-2 p-2 flex-1 min-h-0 overflow-y-auto transition-colors", isOver && "bg-primary/5")}
      >
        {tickets.map((t) => (
          <KanbanCard key={t.id} ticket={t} onSelect={onSelect} />
        ))}
        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-6 border border-dashed border-border/40 rounded-lg">
            <div className="rounded-full bg-muted p-2">
              <Inbox className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-xs text-muted-foreground">No tickets</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanView({
  openTickets,
  recentDone,
  onSelect,
  onDrop,
}: {
  openTickets: WorkTicket[];
  recentDone: WorkTicket[];
  onSelect: (id: string) => void;
  onDrop: (ticketId: string, newStatus: TicketStatus) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const allStatuses: TicketStatus[] = ["BACKLOG", "TODO", "READY", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"];
  const grouped: Record<TicketStatus, WorkTicket[]> = {} as Record<TicketStatus, WorkTicket[]>;
  for (const s of STATUS_ORDER) grouped[s] = openTickets.filter((t) => t.status === s);
  grouped["DONE"] = recentDone;

  const allTickets = [...openTickets, ...recentDone];
  const draggingTicket = draggingId ? allTickets.find((t) => t.id === draggingId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }: DragStartEvent) => setDraggingId(String(active.id))}
      onDragEnd={(event: DragEndEvent) => {
        setDraggingId(null);
        if (!event.over) return;
        onDrop(String(event.active.id), event.over.id as TicketStatus);
      }}
      onDragCancel={() => setDraggingId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {allStatuses.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            tickets={grouped[status] ?? []}
            onSelect={onSelect}
          />
        ))}
      </div>

      <DragOverlay>
        {draggingTicket ? (
          <div className="bg-card border border-primary/40 rounded-lg p-3 shadow-2xl rotate-1 opacity-95 w-52 cursor-grabbing select-none pointer-events-none">
            {draggingTicket.epic && (
              <p className="text-[10px] font-medium mb-1.5 truncate text-muted-foreground">
                {draggingTicket.epic.name}
              </p>
            )}
            <p className="text-sm font-medium leading-snug line-clamp-2">{draggingTicket.title}</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {draggingTicket.team && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                  {draggingTicket.team}
                </span>
              )}
              <SizeBadge size={draggingTicket.size} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function TicketRow({ ticket, onSelect }: { ticket: WorkTicket; onSelect: (id: string) => void }) {
  const age = ticketAge(ticket);
  const showAge = age !== null && age > 1;

  return (
    <button
      type="button"
      onClick={() => onSelect(ticket.id)}
      className="w-full flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/60 transition-colors group text-left"
    >
      {ticket.priority > 0 && (
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[ticket.priority] ?? "bg-muted-foreground"}`}
          aria-label={`Priority ${ticket.priority}`}
        />
      )}
      <span className="flex-1 text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
        {ticket.title}
      </span>
      {showAge && (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:block">
          {age}d {AGE_LABELS[ticket.status]}
        </span>
      )}
      <SizeBadge size={ticket.size} />
      {ticket.sprint && (
        <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-30">
          {ticket.sprint.name}
        </span>
      )}
      {ticket.dueDate && <DueDatePill dueDate={ticket.dueDate} />}
    </button>
  );
}

// ── Temporal list helpers ─────────────────────────────────────────────────────

type TemporalBucket = "overdue" | "today" | "this-week" | "next-week" | "no-date";

interface TemporalGroup {
  bucket: TemporalBucket;
  label: string;
  tickets: WorkTicket[];
  /** Tailwind classes for the group header dot */
  dotClass: string;
  /** Tailwind classes for the group header text */
  textClass: string;
  /** Default collapsed state */
  defaultCollapsed: boolean;
}

/** Returns midnight for a given date in local time */
function toMidnight(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Returns the Monday of the week containing `d` (local time) */
function weekStart(d: Date): Date {
  const day = d.getDay(); // 0 = Sun, 1 = Mon …
  const diff = day === 0 ? -6 : 1 - day;
  const out = toMidnight(d);
  out.setDate(out.getDate() + diff);
  return out;
}

function classifyTicket(ticket: WorkTicket, now: Date): TemporalBucket {
  if (!ticket.dueDate) return "no-date";
  const due = toMidnight(new Date(ticket.dueDate));
  const today = toMidnight(now);
  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  const thisMonday = weekStart(today);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  thisSunday.setHours(23, 59, 59, 999);
  if (due <= thisSunday) return "this-week";
  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);
  if (due >= nextMonday && due <= nextSunday) return "next-week";
  return "no-date";
}

function buildTemporalGroups(tickets: WorkTicket[]): TemporalGroup[] {
  const now = new Date();
  const buckets: Record<TemporalBucket, WorkTicket[]> = {
    overdue: [],
    today: [],
    "this-week": [],
    "next-week": [],
    "no-date": [],
  };
  for (const t of tickets) {
    buckets[classifyTicket(t, now)].push(t);
  }

  const definitions: Array<{
    bucket: TemporalBucket;
    label: string;
    dotClass: string;
    textClass: string;
    defaultCollapsed: boolean;
  }> = [
    { bucket: "overdue",    label: "Overdue",       dotClass: "bg-red-500",   textClass: "text-red-600 dark:text-red-400",     defaultCollapsed: false },
    { bucket: "today",      label: "Due Today",     dotClass: "bg-amber-500", textClass: "text-amber-700 dark:text-amber-400", defaultCollapsed: false },
    { bucket: "this-week",  label: "This Week",     dotClass: "bg-slate-400", textClass: "text-muted-foreground",              defaultCollapsed: false },
    { bucket: "next-week",  label: "Next Week",     dotClass: "bg-slate-400", textClass: "text-muted-foreground",              defaultCollapsed: false },
    { bucket: "no-date",    label: "No Due Date",   dotClass: "bg-slate-300", textClass: "text-muted-foreground",              defaultCollapsed: true  },
  ];

  return definitions.map((def) => ({
    ...def,
    tickets: buckets[def.bucket],
  }));
}

function CollapsibleGroup({
  group,
  onSelect,
  renderContent,
}: {
  group: TemporalGroup;
  onSelect: (id: string) => void;
  renderContent: (tickets: WorkTicket[], onSelect: (id: string) => void) => React.ReactNode;
}) {
  const autoCollapse = group.defaultCollapsed && group.tickets.length > 5;
  const [collapsed, setCollapsed] = useState(autoCollapse);

  if (group.tickets.length === 0) return null;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors rounded-t-xl"
        aria-expanded={!collapsed}
      >
        <span className={cn("h-2 w-2 rounded-full shrink-0", group.dotClass)} aria-hidden="true" />
        <span className={cn("text-sm font-semibold flex-1 text-left", group.textClass)}>
          {group.label}
        </span>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">{group.tickets.length}</span>
        {collapsed
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1 shrink-0" aria-hidden="true" />
          : <ChevronUp   className="h-3.5 w-3.5 text-muted-foreground ml-1 shrink-0" aria-hidden="true" />
        }
      </button>
      {!collapsed && (
        <CardContent className="pt-1 pb-2">
          {renderContent(group.tickets, onSelect)}
        </CardContent>
      )}
    </Card>
  );
}

function NoDueDateContent({
  tickets,
  onSelect,
}: {
  tickets: WorkTicket[];
  onSelect: (id: string) => void;
}) {
  // Group by status within "No Due Date"
  const byStatus = STATUS_ORDER.reduce<Record<TicketStatus, WorkTicket[]>>(
    (acc, s) => { acc[s] = tickets.filter((t) => t.status === s); return acc; },
    {} as Record<TicketStatus, WorkTicket[]>
  );
  const populated = STATUS_ORDER.filter((s) => byStatus[s].length > 0);

  return (
    <div className="space-y-3 pt-1">
      {populated.map((status) => (
        <div key={status}>
          <div className="flex items-center gap-2 px-3 py-1">
            <span className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
              STATUS_HEADER[status]
            )}>
              {STATUS_LABELS[status]}
            </span>
            <span className="text-xs text-muted-foreground">{byStatus[status].length}</span>
          </div>
          <div className="divide-y divide-border/50">
            {byStatus[status].map((t) => (
              <TicketRow key={t.id} ticket={t} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemporalListView({
  openTickets,
  doneTickets,
  onSelect,
}: {
  openTickets: WorkTicket[];
  doneTickets: WorkTicket[];
  onSelect: (id: string) => void;
}) {
  const groups = buildTemporalGroups(openTickets);
  const hasAnyOpen = openTickets.length > 0;

  return (
    <div className="space-y-4">
      {hasAnyOpen ? (
        groups.map((group) => (
          <CollapsibleGroup
            key={group.bucket}
            group={group}
            onSelect={onSelect}
            renderContent={(tickets, sel) =>
              group.bucket === "no-date"
                ? <NoDueDateContent tickets={tickets} onSelect={sel} />
                : (
                  <div className="divide-y divide-border/50">
                    {tickets.map((t) => <TicketRow key={t.id} ticket={t} onSelect={sel} />)}
                  </div>
                )
            }
          />
        ))
      ) : null}

      {doneTickets.length > 0 && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Completed in last 7 days</CardTitle>
          </CardHeader>
          <CardContent className="pt-1 pb-2">
            <div className="divide-y divide-border/50">
              {doneTickets.map((t) => (
                <TicketRow key={t.id} ticket={t} onSelect={onSelect} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Stepper input ─────────────────────────────────────────────────────────────

function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
          aria-label={`Decrease ${label}`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <span className="text-2xl font-bold tabular-nums w-12 text-center">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
          aria-label={`Increase ${label}`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
      {suffix && <p className="text-xs text-muted-foreground">{suffix}</p>}
    </div>
  );
}

// ── Tab: My Capacity ───────────────────────────────────────────────────────────

function CapacityView({
  openTickets,
  totalHours,
  capacityDefaults,
  activeSprint,
}: {
  openTickets: WorkTicket[];
  totalHours: number;
  capacityDefaults: UserCapacityDefaults;
  activeSprint: ActiveSprintInfo | null;
}) {
  const [hoursPerDay, setHoursPerDay] = useState(capacityDefaults.defaultHoursPerDay);
  const [daysOff, setDaysOff] = useState(activeSprint?.daysOff ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sprintWorkingDays = activeSprint
    ? businessDaysBetween(activeSprint.startDate, activeSprint.endDate)
    : 0;
  const adjustedDays = Math.max(0, sprintWorkingDays - daysOff);
  const availableHours = Math.round(adjustedDays * hoursPerDay);
  const committedHours = totalHours;
  const remainingHours = availableHours - committedHours;
  const utilizationPct = availableHours > 0 ? Math.round((committedHours / availableHours) * 100) : 0;
  const isOver = committedHours > availableHours;

  const barFill = availableHours > 0 ? Math.min(100, utilizationPct) : 0;
  const barColorClass = isOver ? "bg-destructive" : utilizationPct > 80 ? "bg-amber-500" : "bg-primary";

  const unSized = openTickets.filter((t) => !t.size).length;

  async function save() {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultHoursPerDay: hoursPerDay }),
        }),
        activeSprint
          ? fetch("/api/users/me/sprint-capacity", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sprintId: activeSprint.id, daysOff }),
            })
          : Promise.resolve(),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Sprint context banner */}
      {activeSprint ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border bg-muted/30 px-4 py-2.5">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="font-medium text-foreground">{activeSprint.name}</span>
          <span className="text-muted-foreground">·</span>
          <span>
            {new Date(activeSprint.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" – "}
            {new Date(activeSprint.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <span className="text-muted-foreground">·</span>
          <span>{sprintWorkingDays} working days</span>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          No active sprint. Start a sprint to track capacity.
        </div>
      )}

      {/* Availability steppers */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold">My Availability</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-5">
          <div className="flex items-start justify-around gap-6 flex-wrap">
            <Stepper
              label="Hours / day"
              value={hoursPerDay}
              onChange={setHoursPerDay}
              min={1}
              max={24}
              step={1}
              suffix="hours per working day"
            />

            {activeSprint && (
              <>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available days</p>
                  <p className="text-2xl font-bold tabular-nums">{adjustedDays}</p>
                  <p className="text-xs text-muted-foreground">of {sprintWorkingDays} working days</p>
                </div>

                <Stepper
                  label="Days off"
                  value={daysOff}
                  onChange={setDaysOff}
                  min={0}
                  max={sprintWorkingDays}
                  step={1}
                  suffix="days unavailable"
                />

                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available hours</p>
                  <p className="text-2xl font-bold tabular-nums">{availableHours}h</p>
                  <p className="text-xs text-muted-foreground">this sprint</p>
                </div>
              </>
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                saved
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {saved ? "Saved!" : saving ? "Saving…" : "Save availability"}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Utilization bar — Float-style */}
      {availableHours > 0 && (
        <Card>
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Sprint load</span>
              <span className={cn("font-semibold text-base tabular-nums", isOver ? "text-destructive" : utilizationPct > 80 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400")}>
                {utilizationPct}%
              </span>
            </div>

            {/* Segmented bar */}
            <div className="relative w-full bg-muted rounded-full h-6 overflow-hidden" role="progressbar" aria-valuenow={barFill} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={cn("h-6 rounded-full transition-all flex items-center justify-end pr-2", barColorClass)}
                style={{ width: `${barFill}%` }}
              >
                {barFill > 15 && (
                  <span className="text-xs font-semibold text-white tabular-nums">{committedHours}h</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", barColorClass)} />
                <span>{committedHours}h committed</span>
              </div>
              <span>
                {isOver
                  ? <span className="text-destructive font-medium">{Math.abs(remainingHours)}h over capacity</span>
                  : <span className="text-green-600 dark:text-green-400 font-medium">{remainingHours}h remaining</span>
                }
              </span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                <span>{availableHours}h available</span>
              </div>
            </div>

            {unSized > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-md px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/20">
                {unSized} ticket{unSized !== 1 ? "s are" : " is"} unsized — their hours aren't included in the committed total above.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ticket breakdown — allocation blocks */}
      {openTickets.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm font-semibold">
              Your sprint tickets
              <span className="ml-2 text-xs font-normal text-muted-foreground">{openTickets.length} open</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {openTickets.map((ticket) => {
                const hrs = ticket.size ? SIZE_HOURS[ticket.size] : null;
                const widthPct = availableHours > 0 && hrs ? Math.min(100, Math.round((hrs / availableHours) * 100)) : 0;
                return (
                  <li key={ticket.id} className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0",
                        STATUS_HEADER[ticket.status]
                      )}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                      <span className="text-sm font-medium truncate flex-1">{ticket.title}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {hrs != null ? `${hrs}h` : "unsized"}
                      </span>
                    </div>
                    {hrs != null && availableHours > 0 && (
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary/60 h-1.5 rounded-full" style={{ width: `${widthPct}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {openTickets.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium">No open tickets</p>
          <p className="text-sm text-muted-foreground">Nothing committed — your capacity is free.</p>
        </div>
      )}
    </div>
  );
}

// ── Tab: Upcoming Deadlines ────────────────────────────────────────────────────

function DeadlinesView({
  deadlines,
  onSelect,
}: {
  deadlines: DeadlineTicket[];
  onSelect: (id: string) => void;
}) {
  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-14 text-center max-w-2xl">
        <CalendarClock className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
        <p className="text-sm font-medium">No upcoming deadlines</p>
        <p className="text-sm text-muted-foreground">None of your open tickets have a due date set.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {deadlines.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => onSelect(ticket.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ticket.title}</p>
                    {ticket.sprint && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.sprint.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TicketStatusBadge status={ticket.status} />
                    {ticket.dueDate && <DueDatePill dueDate={ticket.dueDate} />}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const TABS: { key: MyWorkTab; label: string }[] = [
  { key: "tickets", label: "My Tickets" },
  { key: "capacity", label: "My Capacity" },
  { key: "deadlines", label: "Upcoming Deadlines" },
];

export function MyWorkClient({
  activeTab,
  openTickets,
  recentDone,
  totalHours,
  upcomingDeadlines,
  capacityDefaults,
  activeSprint,
}: MyWorkClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [localOpen, setLocalOpen] = useState<WorkTicket[]>(openTickets);
  const [localDone, setLocalDone] = useState<WorkTicket[]>(recentDone);

  useEffect(() => {
    const saved = localStorage.getItem("ticket-intake:my-work-view") as ViewMode | null;
    if (saved === "kanban" || saved === "list") setViewMode(saved);
  }, []);

  function switchView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("ticket-intake:my-work-view", mode);
  }

  function applyStatusChange(ticketId: string, newStatus: TicketStatus) {
    if (newStatus === "DONE") {
      const ticket = localOpen.find((t) => t.id === ticketId);
      if (ticket) {
        setLocalOpen((prev) => prev.filter((t) => t.id !== ticketId));
        setLocalDone((prev) => [{ ...ticket, status: newStatus }, ...prev]);
      } else {
        setLocalDone((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
      }
    } else {
      const doneTicket = localDone.find((t) => t.id === ticketId);
      if (doneTicket) {
        setLocalDone((prev) => prev.filter((t) => t.id !== ticketId));
        setLocalOpen((prev) => [...prev, { ...doneTicket, status: newStatus }]);
      } else {
        setLocalOpen((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
      }
    }
  }

  async function handleDrop(ticketId: string, newStatus: TicketStatus) {
    const all = [...localOpen, ...localDone];
    const ticket = all.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;
    applyStatusChange(ticketId, newStatus);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        applyStatusChange(ticketId, ticket.status);
        notify.error("Failed to update status");
      }
    } catch {
      applyStatusChange(ticketId, ticket.status);
      notify.error("Failed to update status");
    }
  }

  const isEmpty = localOpen.length === 0 && localDone.length === 0;

  return (
    <div className={cn("p-6 space-y-6", activeTab === "tickets" && viewMode === "list" && "max-w-3xl mx-auto")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Work</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your assigned tickets and workload
          </p>
        </div>

        {/* Kanban/list toggle — only shown on Tickets tab */}
        {activeTab === "tickets" && (
          <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-muted/30 shrink-0" aria-label="View toggle">
            <button
              onClick={() => switchView("kanban")}
              className={cn(
                "flex items-center justify-center h-7 w-7 rounded-md transition-colors",
                viewMode === "kanban"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Kanban view"
              aria-pressed={viewMode === "kanban"}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => switchView("list")}
              className={cn(
                "flex items-center justify-center h-7 w-7 rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Tab nav */}
      <nav aria-label="My work sections" className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={key === "tickets" ? "/my-work" : `/my-work?tab=${key}`}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors hover:no-underline",
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === "tickets" && (
        <>
          {isEmpty ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-14 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-medium">You&apos;re all caught up</p>
                <p className="text-sm text-muted-foreground">No open tickets assigned to you right now.</p>
              </div>
              <Link
                href="/tickets"
                className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Browse all tickets
              </Link>
            </div>
          ) : viewMode === "kanban" ? (
            <KanbanView openTickets={localOpen} recentDone={localDone} onSelect={setSelectedTicketId} onDrop={handleDrop} />
          ) : (
            <TemporalListView
              openTickets={localOpen}
              doneTickets={localDone}
              onSelect={setSelectedTicketId}
            />
          )}
        </>
      )}

      {activeTab === "capacity" && (
        <CapacityView
          openTickets={localOpen}
          totalHours={totalHours}
          capacityDefaults={capacityDefaults}
          activeSprint={activeSprint}
        />
      )}

      {activeTab === "deadlines" && (
        <DeadlinesView deadlines={upcomingDeadlines} onSelect={setSelectedTicketId} />
      )}

      {/* Ticket detail panel */}
      {selectedTicketId && (
        <KanbanTicketPanel
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          onStatusChange={(newStatus) => { if (selectedTicketId) applyStatusChange(selectedTicketId, newStatus); }}
        />
      )}
    </div>
  );
}
