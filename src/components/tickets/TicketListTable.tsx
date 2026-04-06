// SPEC: tickets.md
// SPEC: design-improvements.md
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { TicketSummary } from "@/types";
import { BulkActionBar } from "./BulkActionBar";
import { Checkbox } from "@/components/ui/checkbox";
import { SortHeader } from "./SortHeader";
import type { SortKey } from "./SortHeader";
import { TicketTableRow } from "./TicketTableRow";
import { Inbox } from "lucide-react";

// Local alias — TicketSummary covers all fields used by this component.
type ListTicket = TicketSummary;

interface TicketListTableProps {
  tickets: ListTicket[];
}

export function TicketListTable({ tickets: initialTickets }: TicketListTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Increment to trigger a re-render / data refresh after bulk action
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const sorted = [...initialTickets].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title":     cmp = a.title.localeCompare(b.title); break;
      case "status":    cmp = a.status.localeCompare(b.status); break;
      case "priority":  cmp = a.priority - b.priority; break;
      case "size":      cmp = (a.size ?? "").localeCompare(b.size ?? ""); break;
      case "assignee":  cmp = (a.assignee?.name ?? "").localeCompare(b.assignee?.name ?? ""); break;
      case "sprint":    cmp = (a.sprint?.name ?? "").localeCompare(b.sprint?.name ?? ""); break;
      case "epic":      cmp = (a.epic?.name ?? "").localeCompare(b.epic?.name ?? ""); break;
      case "createdAt": cmp = new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Selection helpers
  const allOnPageSelected = sorted.length > 0 && sorted.every((t) => selectedIds.has(t.id));
  const someOnPageSelected = sorted.some((t) => selectedIds.has(t.id));

  function toggleAll(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      sorted.forEach((t) => (checked ? next.add(t.id) : next.delete(t.id)));
      return next;
    });
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleBulkSuccess() {
    router.refresh();
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-3" key={refreshKey}>
      {/* Bulk action bar — only visible when ≥1 ticket selected */}
      <BulkActionBar
        selectedIds={selectedIds}
        onClear={() => setSelectedIds(new Set())}
        onSuccess={handleBulkSuccess}
      />

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-185">
          <thead>
            <tr className="bg-muted/50 border-b">
              {/* Select-all checkbox */}
              <th className="w-10 px-3 py-3">
                <Checkbox
                  checked={allOnPageSelected ? true : someOnPageSelected ? false : false}
                  onCheckedChange={(v) => toggleAll(v === true)}
                  aria-label="Select all tickets on this page"
                />
              </th>
              <SortHeader label="Title"    sortKey="title"     current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Status"   sortKey="status"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Priority" sortKey="priority"  current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Size"     sortKey="size"      current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Assignee" sortKey="assignee"  current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Sprint"   sortKey="sprint"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Epic"     sortKey="epic"      current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Created"  sortKey="createdAt" current={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full bg-muted p-3 w-fit mx-auto">
                      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">No tickets found</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your filters or create a new ticket.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((ticket) => (
                <TicketTableRow
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={selectedIds.has(ticket.id)}
                  onToggle={toggleOne}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
