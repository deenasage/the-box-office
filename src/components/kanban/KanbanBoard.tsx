// SPEC: tickets.md
"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TicketStatus, Team } from "@prisma/client";
import { KanbanTicket, GroupBy, COLUMNS, PRIORITY_GROUP_LABELS } from "./types";
import { KanbanColumn, SwimlaneRow } from "./KanbanColumn";
import { KanbanTicketPanel } from "./KanbanTicketPanel";
import { notify } from "@/lib/toast";
import { QuickCreateTicket } from "@/components/tickets/QuickCreateTicket";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, LayoutGrid, List, Download } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

const TEAMS = Object.values(Team);

const TEAM_LABELS: Record<Team, string> = {
  CONTENT:    "Content",
  DESIGN:     "Design",
  SEO:        "SEO",
  WEM:        "WEM",
  PAID_MEDIA: "Paid Media",
  ANALYTICS:  "Analytics",
};

interface Filters { team: Team | ""; sprintId: string; assigneeId: string }

const FILTERS_STORAGE_KEY = "ticket-intake:kanban-filters";
const GROUPBY_STORAGE_KEY = "ticket-intake:kanban-groupby";

function loadFilters(): Filters {
  if (typeof window === "undefined") return { team: "", sprintId: "", assigneeId: "" };
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return { team: "", sprintId: "", assigneeId: "" };
    return { team: "", sprintId: "", assigneeId: "", ...(JSON.parse(raw) as Partial<Filters>) };
  } catch { return { team: "", sprintId: "", assigneeId: "" }; }
}

function loadGroupBy(): GroupBy {
  if (typeof window === "undefined") return "none";
  try { return (localStorage.getItem(GROUPBY_STORAGE_KEY) as GroupBy) ?? "none"; }
  catch { return "none"; }
}

// ── Inner board (reads useSearchParams) ─────────────────────────────────────
function KanbanBoardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [tickets, setTickets] = useState<KanbanTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sprints, setSprints] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<Filters>({ team: "", sprintId: "", assigneeId: "" });
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TicketStatus | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showCarryoverOnly, setShowCarryoverOnly] = useState(false);
  const [wipLimits, setWipLimits] = useState<Record<string, number | null>>({});
  const [announcement, setAnnouncement] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchTickets = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "200" });
    if (f.team) params.set("team", f.team);
    if (f.sprintId) params.set("sprintId", f.sprintId);
    if (f.assigneeId) params.set("assigneeId", f.assigneeId);
    try {
      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = (await res.json()) as { data: KanbanTicket[] };
      setTickets(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore filters from localStorage on mount (URL params take precedence if present)
  useEffect(() => {
    const urlTeam = (searchParams.get("team") ?? "") as Team | "";
    const urlSprintId = searchParams.get("sprintId") ?? "";
    const urlAssigneeId = searchParams.get("assigneeId") ?? "";
    const hasUrlFilters = urlTeam || urlSprintId || urlAssigneeId;
    if (hasUrlFilters) {
      setFilters({ team: urlTeam, sprintId: urlSprintId, assigneeId: urlAssigneeId });
    } else {
      setFilters(loadFilters());
    }
    setGroupBy(loadGroupBy());
    setFiltersLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist filters to localStorage when they change
  useEffect(() => {
    if (!filtersLoaded) return;
    try { localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters)); } catch { /* ignore */ }
  }, [filters, filtersLoaded]);

  // Persist groupBy to localStorage when it changes
  useEffect(() => {
    if (!filtersLoaded) return;
    try { localStorage.setItem(GROUPBY_STORAGE_KEY, groupBy); } catch { /* ignore */ }
  }, [groupBy, filtersLoaded]);

  useEffect(() => {
    if (!filtersLoaded) return;
    void fetchTickets(filters);
    fetch("/api/sprints?limit=50")
      .then((r) => r.json())
      .then((j: { data: { id: string; name: string }[] }) => setSprints(j.data ?? []))
      .catch(() => {});
    fetch("/api/users")
      .then((r) => r.json())
      .then((j: { id: string; name: string }[]) => setUsers(Array.isArray(j) ? j : []))
      .catch(() => {});
    fetch("/api/kanban/wip-limits")
      .then((r) => r.json())
      .then((configs: { status: string; wipLimit: number | null }[]) => {
        const map: Record<string, number | null> = {};
        for (const c of configs) map[c.status] = c.wipLimit;
        setWipLimits(map);
      })
      .catch(() => {});
  }, [filtersLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilter(update: Partial<Filters>) {
    const next = { ...filters, ...update };
    setFilters(next);
    // Sync to URL so the filtered view is shareable
    const params = new URLSearchParams();
    if (next.team) params.set("team", next.team);
    if (next.sprintId) params.set("sprintId", next.sprintId);
    if (next.assigneeId) params.set("assigneeId", next.assigneeId);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    void fetchTickets(next);
  }

  // Merge hardcoded COLUMNS config with DB-fetched WIP limits.
  // The fetched value takes precedence; falls back to the static default if not yet loaded.
  const columns = COLUMNS.map((col) => ({
    ...col,
    wipLimit: col.status in wipLimits ? wipLimits[col.status] : col.wipLimit,
  }));

  async function handleDrop(targetStatus: TicketStatus, activeId: string) {
    if (updating) return;
    const ticket = tickets.find((t) => t.id === activeId);
    if (!ticket || ticket.status === targetStatus) return;

    // Soft WIP limit warning: warn but still allow the move
    const targetCol = columns.find((c) => c.status === targetStatus);
    if (targetCol?.wipLimit !== null && targetCol?.wipLimit !== undefined) {
      const currentCount = tickets.filter((t) => t.status === targetStatus).length;
      if (currentCount >= targetCol.wipLimit) {
        notify.warning(
          `WIP limit for "${targetCol.label}" is ${targetCol.wipLimit} (currently ${currentCount}). Moving anyway.`
        );
      }
    }

    setUpdating(activeId);
    setTickets((prev) => prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus } : t)));
    try {
      const res = await fetch(`/api/tickets/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) {
        setTickets((prev) => prev.map((t) => (t.id === activeId ? { ...t, status: ticket.status } : t)));
        const label = columns.find((c) => c.status === targetStatus)?.label ?? targetStatus;
        let serverMsg = "";
        try { serverMsg = ((await res.json()) as { error?: string }).error ?? ""; } catch { /* ignore */ }
        notify.error(serverMsg || `Failed to move ticket to ${label}`);
      }
    } catch {
      setTickets((prev) => prev.map((t) => (t.id === activeId ? { ...t, status: ticket.status } : t)));
      const label = columns.find((c) => c.status === targetStatus)?.label ?? targetStatus;
      notify.error(`Failed to move ticket to ${label}`);
    } finally {
      setUpdating(null);
    }
  }

  function handleStatusChangeFromCard(ticketId: string, newStatus: string) {
    handleStatusChangeFromPanel(ticketId, newStatus as TicketStatus);
  }

  function handleStatusChangeFromPanel(ticketId: string, newStatus: TicketStatus) {
    // Optimistically update board state, then persist
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;
    setUpdating(ticketId);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)));
    void fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => {
        if (!res.ok) {
          setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: ticket.status } : t)));
          notify.error("Failed to update status");
        }
      })
      .catch(() => {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: ticket.status } : t)));
        notify.error("Failed to update status");
      })
      .finally(() => setUpdating(null));
  }

  // ── dnd-kit event handlers ───────────────────────────────────────────────
  function onDndDragStart({ active }: DragStartEvent) {
    const title = (active.data.current as { title?: string } | undefined)?.title ?? String(active.id);
    setDragId(String(active.id));
    setAnnouncement(`Picked up card: ${title}`);
  }

  function onDndDragOver({ over }: DragOverEvent) {
    if (over) {
      const col = columns.find((c) => c.status === over.id);
      const label = col?.label ?? String(over.id);
      setDragOverStatus(over.id as TicketStatus);
      setAnnouncement(`Moving over ${label} column`);
    }
  }

  async function onDndDragEnd({ active, over }: DragEndEvent) {
    setDragId(null);
    setDragOverStatus(null);
    if (over) {
      const targetStatus = over.id as TicketStatus;
      const col = columns.find((c) => c.status === targetStatus);
      const label = col?.label ?? String(over.id);
      setAnnouncement(`Dropped card into ${label} column`);
      await handleDrop(targetStatus, String(active.id));
    } else {
      setAnnouncement("Drop cancelled");
    }
  }

  // Apply carryover filter — when active, only show tickets where isCarryover === true
  const visibleTickets = showCarryoverOnly
    ? tickets.filter((t) => t.isCarryover)
    : tickets;

  // Swimlane groups (computed only when groupBy !== "none")
  const swimlaneGroups = groupBy === "none" ? [] : (() => {
    const keyOf = (t: KanbanTicket): string => {
      if (groupBy === "team") return t.team ?? "No Team";
      if (groupBy === "epic") return t.epic?.name ?? "No Project";
      if (groupBy === "priority") return PRIORITY_GROUP_LABELS[t.priority] ?? "No Priority";
      return t.assignee?.name ?? "Unassigned";
    };
    // For priority, preserve natural sort order (High → Medium → Low → No Priority)
    const allKeys = groupBy === "priority"
      ? (["High", "Medium", "Low", "No Priority"] as string[]).filter((k) =>
          visibleTickets.some((t) => keyOf(t) === k)
        )
      : Array.from(new Set(visibleTickets.map(keyOf)));
    return allKeys.map((k) => ({ key: k, label: k, tickets: visibleTickets.filter((t) => keyOf(t) === k) }));
  })();

  const byStatus = Object.fromEntries(
    columns.map((c) => [c.status, visibleTickets.filter((t) => t.status === c.status)])
  ) as Record<TicketStatus, KanbanTicket[]>;

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportTickets(format: "csv" | "json") {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(tickets, null, 2)], { type: "application/json" });
      downloadBlob(blob, "tickets.json");
    } else {
      const header = ["ID", "Title", "Status", "Team", "Priority", "Size", "Assignee", "Sprint", "Epic"];
      const rows = tickets.map((t) => [
        t.id,
        `"${(t.title ?? "").replace(/"/g, '""')}"`,
        t.status,
        t.team ?? "",
        String(t.priority),
        t.size ?? "",
        t.assignee?.name ?? "",
        "",
        t.epic?.name ?? "",
      ]);
      const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      downloadBlob(blob, "tickets.csv");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDndDragStart}
      onDragOver={onDndDragOver}
      onDragEnd={(e) => { void onDndDragEnd(e); }}
    >
      {/* Screen-reader live region for drag announcements (WCAG 2.1 SC 2.1.1) */}
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Shared keyboard drag instructions — referenced by aria-describedby on each card */}
      <span id="drag-instructions" className="sr-only">
        Press Space to pick up a card, use arrow keys to move between columns, press Space again to drop, or press Escape to cancel.
      </span>

      <div className="flex flex-col h-full">
        {/* Top toolbar: group-by + view toggle + new ticket */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Group by:</span>
          {(["none", "team", "epic", "assignee", "priority"] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                groupBy === g
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {g === "none" ? "None"
                : g === "team" ? "Team"
                : g === "epic" ? "Project"
                : g === "assignee" ? "Assignee"
                : "Priority"}
            </button>
          ))}

          {/* Board / List view toggle */}
          <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-muted/30 ml-2" aria-label="View toggle">
            <span
              className="flex items-center justify-center h-7 w-7 rounded-md bg-background text-foreground shadow-sm"
              aria-label="Board view (current)"
              aria-current="page"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </span>
            <Link
              href="/tickets/list"
              aria-label="List view"
              className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    aria-label="Export tickets"
                  />
                }
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => exportTickets("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportTickets("json")}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowQuickCreate((v) => !v)}
              aria-expanded={showQuickCreate}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New Ticket
            </Button>
          </div>
        </div>

        {/* Divider between toolbar and filter bar */}
        <div className="border-b border-border mb-3" />

        {/* Inline quick-create form */}
        {showQuickCreate && (
          <div className="mb-4">
            <QuickCreateTicket
              sprints={sprints}
              users={users}
              onCreated={() => {
                setShowQuickCreate(false);
                void fetchTickets(filters);
              }}
              onCancel={() => setShowQuickCreate(false)}
            />
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Select
            value={filters.team || "_all"}
            onValueChange={(v) => applyFilter({ team: (!v || v === "_all" ? "" : v) as Team | "" })}
          >
            <SelectTrigger className="h-8 w-36 text-sm" aria-label="Filter by team">
              <span data-slot="select-value" className="flex flex-1 text-left truncate">
                {filters.team ? (TEAM_LABELS[filters.team] ?? filters.team) : "All Teams"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Teams</SelectItem>
              {TEAMS.map((t) => <SelectItem key={t} value={t}>{TEAM_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={filters.sprintId || "_all"}
            onValueChange={(v) => applyFilter({ sprintId: !v || v === "_all" ? "" : v })}
          >
            <SelectTrigger className="h-8 w-40 text-sm" aria-label="Filter by sprint">
              <span data-slot="select-value" className="flex flex-1 text-left truncate">
                {filters.sprintId ? (sprints.find((s) => s.id === filters.sprintId)?.name ?? filters.sprintId) : "All Sprints"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Sprints</SelectItem>
              {sprints.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={filters.assigneeId || "_all"}
            onValueChange={(v) => applyFilter({ assigneeId: !v || v === "_all" ? "" : v })}
          >
            <SelectTrigger className="h-8 w-40 text-sm" aria-label="Filter by assignee">
              <span data-slot="select-value" className="flex flex-1 text-left truncate">
                {filters.assigneeId ? (users.find((u) => u.id === filters.assigneeId)?.name ?? filters.assigneeId) : "All Assignees"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Assignees</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => {
              try { localStorage.removeItem(FILTERS_STORAGE_KEY); localStorage.removeItem(GROUPBY_STORAGE_KEY); } catch { /* ignore */ }
              setGroupBy("none");
              applyFilter({ team: "", sprintId: "", assigneeId: "" });
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-0.5"
          >
            Reset
          </button>
          <button
            onClick={() => setShowCarryoverOnly((v) => !v)}
            aria-pressed={showCarryoverOnly}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              showCarryoverOnly
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            Carryover only
          </button>
          <span className="ml-auto text-xs text-muted-foreground">
            {visibleTickets.length} ticket{visibleTickets.length !== 1 ? "s" : ""}
            {updating && " · Saving…"}
          </span>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-4 w-full">
            {columns.map((c) => (
              <div key={c.status} className={cn("flex-1 min-w-50 rounded-xl border-t-4 bg-card/50 h-64 animate-pulse", c.color)} />
            ))}
          </div>
        ) : groupBy !== "none" ? (
          <div className="overflow-y-auto flex-1 pb-6">
            {swimlaneGroups.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-12">No tickets to display.</p>
              : swimlaneGroups.map((lane) => (
                  <SwimlaneRow
                    key={lane.key}
                    label={lane.label}
                    tickets={lane.tickets}
                    columns={columns}
                    dragOverStatus={dragOverStatus}
                    onDragOver={setDragOverStatus}
                    onDrop={(status) => { void handleDrop(status, dragId ?? ""); }}
                    onDragStart={setDragId}
                    onCardClick={setSelectedTicketId}
                    onStatusChange={handleStatusChangeFromCard}
                  />
                ))
            }
          </div>
        ) : (
          <div className="flex gap-3 pb-6 flex-1 w-full">
            {columns.map((col) => (
              <KanbanColumn
                key={col.status}
                config={col}
                tickets={byStatus[col.status] ?? []}
                isOver={dragOverStatus === col.status}
                onDragOver={() => setDragOverStatus(col.status)}
                onDrop={() => { void handleDrop(col.status, dragId ?? ""); }}
                onDragStart={setDragId}
                onCardClick={setSelectedTicketId}
                onStatusChange={handleStatusChangeFromCard}
              />
            ))}
          </div>
        )}

        {/* Side panel */}
        {selectedTicketId && (
          <KanbanTicketPanel
            ticketId={selectedTicketId}
            onClose={() => setSelectedTicketId(null)}
            onStatusChange={(newStatus) => handleStatusChangeFromPanel(selectedTicketId, newStatus)}
          />
        )}
      </div>

      {/* Floating drag preview — portal-rendered above all overflow containers */}
      <DragOverlay>
        {dragId ? (() => {
          const t = tickets.find((x) => x.id === dragId);
          if (!t) return null;
          return (
            <div className="bg-card border border-primary/40 rounded-lg p-3 shadow-2xl rotate-1 opacity-95 w-52 cursor-grabbing select-none pointer-events-none">
              {t.epic && (
                <div
                  className="text-[10px] font-medium mb-1.5 px-1.5 py-0.5 rounded inline-block max-w-full truncate"
                  style={{ backgroundColor: `${t.epic.color ?? "#6366f1"}22`, color: t.epic.color ?? "#6366f1" }}
                >
                  {t.epic.name}
                </div>
              )}
              <p className="text-sm font-medium leading-snug line-clamp-2">{t.title}</p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {t.team && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    {t.team}
                  </span>
                )}
                {t.size && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    {t.size}
                  </span>
                )}
              </div>
            </div>
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── Public export — wraps inner component in Suspense for useSearchParams ────
export function KanbanBoard() {
  return (
    <Suspense
      fallback={
        <div className="flex gap-3 overflow-x-auto pb-4 w-full">
          {COLUMNS.map((c) => (
            <div
              key={c.status}
              className={cn("flex-1 min-w-50 rounded-xl border-t-4 bg-card/50 h-64 animate-pulse", c.color)}
            />
          ))}
        </div>
      }
    >
      <KanbanBoardInner />
    </Suspense>
  );
}
