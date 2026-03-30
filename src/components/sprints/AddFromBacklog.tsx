// SPEC: sprint-scrum.md
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Team, TicketSize, TicketStatus } from "@prisma/client";

interface BacklogTicket {
  id: string;
  title: string;
  team: Team;
  size: TicketSize | null;
  status: TicketStatus;
}

type StatusFilter = "ALL" | "BACKLOG" | "FLAGGED";

interface AddFromBacklogProps {
  sprintId: string;
  currentTicketIds: string[];
}

export function AddFromBacklog({ sprintId, currentTicketIds }: AddFromBacklogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [tickets, setTickets] = useState<BacklogTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    // Fetch all unscheduled tickets (both BACKLOG and TODO/Flagged)
    fetch("/api/tickets?sprintId=null&limit=200")
      .then((r) => r.json())
      .then((json: { data: BacklogTicket[] }) => {
        const currentSet = new Set(currentTicketIds);
        // Keep only BACKLOG and TODO statuses, excluding already-in-sprint tickets
        const available = (json.data ?? []).filter(
          (t) =>
            !currentSet.has(t.id) &&
            (t.status === TicketStatus.BACKLOG || t.status === TicketStatus.TODO)
        );
        setTickets(available);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, currentTicketIds]);

  function toggleTicket(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      await Promise.all(
        Array.from(selected).map((ticketId) =>
          fetch(`/api/tickets/${ticketId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sprintId }),
          })
        )
      );
      setSelected(new Set());
      setOpen(false);
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  const backlogCount = tickets.filter((t) => t.status === TicketStatus.BACKLOG).length;
  const flaggedCount = tickets.filter((t) => t.status === TicketStatus.TODO).length;

  const visibleTickets = tickets.filter((t) => {
    if (statusFilter === "BACKLOG") return t.status === TicketStatus.BACKLOG;
    if (statusFilter === "FLAGGED") return t.status === TicketStatus.TODO;
    return true;
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        Add from backlog
      </button>

      {open && (
        <div className="border-t">
          {loading ? (
            <p className="text-sm text-muted-foreground px-4 py-3">Loading tickets…</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-3">
              No unscheduled tickets available.
            </p>
          ) : (
            <>
              {/* Status filter pills */}
              <div className="px-4 py-2 border-b bg-muted/10 flex items-center gap-2 flex-wrap">
                {(
                  [
                    { key: "ALL" as const, label: "All", count: tickets.length },
                    { key: "BACKLOG" as const, label: "Backlog", count: backlogCount },
                    { key: "FLAGGED" as const, label: "Prioritized", count: flaggedCount },
                  ] as const
                ).map(({ key, label, count }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      statusFilter === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                    aria-pressed={statusFilter === key}
                  >
                    {label}
                    <span
                      className={`rounded-full px-1 py-0 text-[10px] font-semibold ${
                        statusFilter === key
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="divide-y max-h-64 overflow-y-auto">
                {visibleTickets.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleTicket(t.id)}
                      className="accent-primary shrink-0"
                    />
                    <span className="flex-1 text-sm truncate flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{t.title}</span>
                      {t.status === TicketStatus.TODO && (
                        <Badge
                          className="shrink-0 px-1.5 py-0 text-[10px] font-medium bg-[#008146]/10 text-[#008146] dark:bg-[#00D93A]/15 dark:text-[#00D93A] border-0"
                        >
                          Prioritized
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{t.team}</span>
                    {t.size && (
                      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">
                        {t.size}
                      </span>
                    )}
                  </label>
                ))}
                {visibleTickets.length === 0 && (
                  <p className="text-sm text-muted-foreground px-4 py-3">
                    No tickets match the selected filter.
                  </p>
                )}
              </div>

              <div className="px-4 py-3 border-t bg-muted/20">
                <Button
                  size="sm"
                  disabled={selected.size === 0 || adding}
                  onClick={handleAdd}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {adding
                    ? "Adding…"
                    : selected.size > 0
                    ? `Add selected (${selected.size})`
                    : "Add selected"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
