// SPEC: design-improvements.md
// SPEC: tickets.md
"use client";

import { DndContext, DragOverlay } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketCard } from "./TicketCard";
import { WipLimitSettings } from "./WipLimitSettings";
import { Team, TicketStatus, UserRole } from "@prisma/client";
import type { TicketSummary } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Inbox, Settings2, Zap } from "lucide-react";
import { useTicketBoard } from "@/hooks/useTicketBoard";
import { BulkActionBar } from "./BulkActionBar";
import { QuickCreateTicket } from "./QuickCreateTicket";
import { SavedFilters, type SavedFilter } from "./SavedFilters";
import { TicketTemplateManager, type TicketTemplate } from "./TicketTemplateManager";

type Ticket = TicketSummary;

interface Column {
  status: TicketStatus;
  label: string;
}

interface TicketBoardProps {
  columns: Column[];
  tickets: Ticket[];
  sprints: { id: string; name: string; isActive: boolean }[];
  currentUser?: { id: string; name: string; role?: UserRole; team?: Team | null } | null;
}

const TEAM_OPTIONS = [
  { value: "", label: "All teams" },
  { value: "CONTENT", label: "Content" },
  { value: "DESIGN", label: "Design" },
  { value: "SEO", label: "SEO" },
  { value: "WEM", label: "WEM" },
  { value: "PAID_MEDIA", label: "Paid Media" },
  { value: "ANALYTICS", label: "Analytics" },
];

const COLUMN_EMPTY_MESSAGES: Record<TicketStatus, string> = {
  BACKLOG: "",
  TODO: "Drag tickets here from Backlog to start planning",
  READY: "No sprint-assigned tickets yet",
  IN_PROGRESS: "No tickets currently in progress",
  IN_REVIEW: "No tickets awaiting review",
  BLOCKED: "No blocked tickets — great news!",
  DONE: "No completed tickets yet this sprint",
};

const STATUS_DOT: Record<TicketStatus, string> = {
  BACKLOG: "bg-muted-foreground/40",
  TODO: "bg-blue-400",
  READY: "bg-sky-400",
  IN_PROGRESS: "bg-violet-400",
  IN_REVIEW: "bg-amber-400",
  BLOCKED: "bg-orange-500",
  DONE: "bg-[#008146]",
};

// ─── Draggable ticket wrapper ─────────────────────────────────────────────────

interface DraggableTicketCardProps {
  ticket: Ticket;
  isSelected: boolean;
  hasSelection: boolean;
  onToggle: (id: string) => void;
}

function DraggableTicketCard({ ticket, isSelected, hasSelection, onToggle }: DraggableTicketCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: ticket.id, data: { status: ticket.status } });

  const style = {
    transform: CSS.Translate.toString(transform),
    // Card becomes invisible while dragging — the DragOverlay clone is the
    // only visible representation. This prevents double-rendering of the card.
    opacity: isDragging ? 0 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} suppressHydrationWarning className="relative group/card">
      {/* Checkbox — visible when something is selected, or on card hover */}
      <div
        className={`absolute top-2 left-2 z-10 transition-opacity ${
          hasSelection || isSelected ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"
        }`}
        // Stop drag events from firing when clicking the checkbox area
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(ticket.id)}
          aria-label={`Select ticket: ${ticket.title}`}
          className="h-3.5 w-3.5 rounded border-gray-300 accent-primary cursor-pointer"
        />
      </div>
      {/* Drag handle covers the rest of the card */}
      <div {...listeners} className={isSelected ? "ring-2 ring-primary/40 rounded-lg" : ""}>
        <TicketCard {...ticket} />
      </div>
    </div>
  );
}

// ─── Droppable column ─────────────────────────────────────────────────────────

interface DroppableColumnProps {
  status: TicketStatus;
  label: string;
  tickets: Ticket[];
  wipLimit?: number | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

function DroppableColumn({
  status,
  label,
  tickets,
  wipLimit,
  selectedIds,
  onToggleSelect,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const atLimit = wipLimit != null && tickets.length >= wipLimit;
  const hasSelection = selectedIds.size > 0;

  return (
    <div className="flex flex-col gap-2 min-w-[220px] max-w-[280px] flex-1">
      <div className="flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
        <span className="text-sm font-semibold">{label}</span>
        {atLimit ? (
          <Badge
            variant="destructive"
            className="text-xs px-1.5 py-0.5 font-medium"
            title={`Work In Progress limit reached: max ${wipLimit} tickets allowed in this column`}
          >
            WIP {tickets.length}/{wipLimit}
          </Badge>
        ) : (
          <span
            className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5"
            title={wipLimit != null ? `Work In Progress limit: ${wipLimit} tickets max` : undefined}
          >
            {wipLimit != null ? `${tickets.length}/${wipLimit}` : tickets.length}
          </span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 flex-1 rounded-lg p-2 overflow-y-auto transition-colors ${
          isOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/30"
        }`}
      >
        {tickets.map((ticket) => (
          <DraggableTicketCard
            key={ticket.id}
            ticket={ticket}
            isSelected={selectedIds.has(ticket.id)}
            hasSelection={hasSelection}
            onToggle={onToggleSelect}
          />
        ))}
        {tickets.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-6 text-muted-foreground text-center px-2">
            <Inbox className="h-5 w-5 opacity-40" />
            {status === "BACKLOG" ? (
              <>
                <p className="text-xs">No tickets in backlog</p>
                <Link href="/intake" className="text-xs text-primary hover:underline">
                  Submit a request →
                </Link>
              </>
            ) : (
              <p className="text-xs">{COLUMN_EMPTY_MESSAGES[status]}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function TicketBoard({
  columns,
  tickets: initialTickets,
  sprints,
  currentUser,
}: TicketBoardProps) {
  const {
    tickets,
    visibleTickets,
    teamUsers,
    selectedPersonId,
    setSelectedPersonId,
    selectedSprintGoal,
    wipSettingsOpen,
    setWipSettingsOpen,
    isAdminOrLead,
    currentTeam,
    currentSprint,
    sensors,
    handleDragEnd,
    handleTeamChange,
    applyFilter,
    getWipLimit,
    reloadWipConfigs,
  } = useTicketBoard({ initialTickets, currentUser });

  const router = useRouter();

  // Track which ticket is currently being dragged so we can render its clone
  // inside the DragOverlay — making the card follow the cursor during drag.
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const activeTicket = activeTicketId
    ? tickets.find((t) => t.id === activeTicketId) ?? null
    : null;

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Quick-create state
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<TicketTemplate | undefined>(undefined);
  const activeSprints = sprints.filter((s) => s.isActive);

  function handleUseTemplate(template: TicketTemplate) {
    setActiveTemplate(template);
    setShowQuickCreate(true);
  }

  function handleApplySavedFilter(filter: SavedFilter) {
    const params = new URLSearchParams();
    if (filter.team) params.set("team", filter.team);
    if (filter.sprintId) params.set("sprintId", filter.sprintId);
    if (filter.status) params.set("status", filter.status);
    if (filter.assigneeId) params.set("assigneeId", filter.assigneeId);
    router.push(`/tickets?${params.toString()}`);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTicketId(event.active.id as string);
  }

  async function handleDragEndWithReset(event: Parameters<typeof handleDragEnd>[0]) {
    setActiveTicketId(null);
    await handleDragEnd(event);
  }

  return (
    <div className="flex flex-col gap-3 flex-1 overflow-hidden">
      {wipSettingsOpen && (
        <WipLimitSettings
          open={wipSettingsOpen}
          onClose={() => {
            setWipSettingsOpen(false);
            reloadWipConfigs();
          }}
          filterTeam={currentTeam ? (currentTeam as Team) : null}
        />
      )}

      {/* Filter bar + saved filters */}
      <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={currentTeam || "_all"}
          onValueChange={(v) => handleTeamChange(v === "_all" ? "" : (v ?? ""))}
        >
          <SelectTrigger className="w-36 h-8 text-sm" aria-label="Filter by team">
            <SelectValue placeholder="All teams">
              {currentTeam
                ? (TEAM_OPTIONS.find((o) => o.value === currentTeam)?.label ?? currentTeam)
                : "All teams"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TEAM_OPTIONS.map((o) => (
              <SelectItem
                key={o.value === "" ? "_all" : o.value}
                value={o.value === "" ? "_all" : o.value}
              >
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentTeam && teamUsers.length > 0 && (
          <Select
            value={selectedPersonId || "_all_people"}
            onValueChange={(v) =>
              setSelectedPersonId(v === "_all_people" ? "" : (v ?? ""))
            }
          >
            <SelectTrigger
              className="w-36 h-8 text-sm"
              aria-label="Filter by person"
            >
              <SelectValue placeholder="All people">
                {selectedPersonId
                  ? (teamUsers.find((u) => u.id === selectedPersonId)?.name ?? "All people")
                  : "All people"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_people">All people</SelectItem>
              {teamUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={currentSprint || "_all_sprints"}
          onValueChange={(v) =>
            applyFilter("sprintId", v === "_all_sprints" ? "" : (v ?? ""))
          }
        >
          <SelectTrigger
            className="w-40 h-8 text-sm"
            aria-label="Filter by sprint"
          >
            <SelectValue placeholder="All sprints">
              {currentSprint === "none"
                ? "Backlog only"
                : currentSprint
                ? (() => {
                    const s = sprints.find((sp) => sp.id === currentSprint);
                    return s ? `${s.name}${s.isActive ? " (active)" : ""}` : currentSprint;
                  })()
                : "All sprints"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_sprints">All sprints</SelectItem>
            <SelectItem value="none">Backlog only</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.isActive ? " (active)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {isAdminOrLead && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWipSettingsOpen(true)}
              title="Configure WIP limits"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowQuickCreate((v) => !v)}
            aria-label="Quick create ticket"
            aria-expanded={showQuickCreate}
            title="Quick create ticket"
          >
            <Zap className="h-4 w-4 mr-1" />
            Quick Create
          </Button>
          <Link href="/intake">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Saved filter chips */}
      <SavedFilters
        currentTeam={currentTeam || undefined}
        currentSprintId={currentSprint || undefined}
        onApply={handleApplySavedFilter}
      />

      {/* Template manager — collapsible panel */}
      <TicketTemplateManager onUse={handleUseTemplate} />

      </div>{/* end filter bar + saved filters wrapper */}

      {/* Quick-create inline form */}
      {showQuickCreate && (
        <QuickCreateTicket
          sprints={activeSprints}
          users={teamUsers.length > 0 ? teamUsers : []}
          template={activeTemplate}
          onCreated={() => {
            setShowQuickCreate(false);
            setActiveTemplate(undefined);
            router.refresh();
          }}
          onCancel={() => {
            setShowQuickCreate(false);
            setActiveTemplate(undefined);
          }}
        />
      )}

      {/* Sprint goal banner */}
      {selectedSprintGoal && (
        <div className="px-4 py-2 bg-primary/5 border border-primary/20 rounded-md text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Sprint notes:</span>{" "}
          {selectedSprintGoal}
        </div>
      )}

      {/* Kanban columns */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEndWithReset}
        onDragCancel={() => setActiveTicketId(null)}
      >
        <div className="flex gap-3 flex-1 overflow-x-auto pb-2">
          {columns.map(({ status, label }) => {
            const col = visibleTickets.filter((t) => t.status === status);
            return (
              <DroppableColumn
                key={status}
                status={status}
                label={label}
                tickets={col}
                wipLimit={getWipLimit(status)}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            );
          })}
        </div>

        {/* DragOverlay renders a floating clone of the card that follows the
            cursor. Without this the card just goes invisible mid-drag. */}
        <DragOverlay dropAnimation={null}>
          {activeTicket ? (
            <div className="rotate-1 scale-105 shadow-xl ring-1 ring-primary/30 rounded-lg opacity-95 pointer-events-none">
              <TicketCard {...activeTicket} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Bulk action bar — rendered outside DndContext so it sits at the
          bottom of the board flow and is not affected by drag state */}
      <BulkActionBar
        selectedIds={selectedIds}
        onClear={clearSelection}
        onSuccess={() => {
          clearSelection();
          router.refresh();
        }}
      />
    </div>
  );
}
