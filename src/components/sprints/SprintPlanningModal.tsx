// SPEC: auto-assign-v2.md
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProposalCard } from "./ProposalCard";
import { AssigneeLoadPanel, AssigneeLoadEntry } from "./AssigneeLoadPanel";
import { SkippedTicketsList } from "./SkippedTicketsList";
import { notify } from "@/lib/toast";
import { SIZE_HOURS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PreviewResponseV2,
  ProposalRowV2,
  PlanningFilter,
  AvailableAssigneeV2,
} from "./auto-assign-types";

interface CommitAssignment {
  ticketId: string;
  assigneeId: string | null;
  sprintId: string;
}

interface CommitResponse {
  data: {
    updatedCount: number;
    notifiedCount?: number;
    errors: { ticketId: string; message: string }[];
  };
}

interface SprintPlanningModalProps {
  open: boolean;
  onClose: () => void;
  previewData: PreviewResponseV2;
}

type FilterOption = {
  key: PlanningFilter;
  label: string;
};

const FILTER_OPTIONS: FilterOption[] = [
  { key: "ALL", label: "All" },
  { key: "OK", label: "OK" },
  { key: "OVER_CAPACITY", label: "Over Capacity" },
  { key: "UNASSIGNABLE", label: "Unassignable" },
  { key: "REMOVED", label: "Removed" },
];

function initRows(previewData: PreviewResponseV2): ProposalRowV2[] {
  return [...previewData.proposals]
    .sort((a, b) => {
      if (a.dependencyOrder !== b.dependencyOrder)
        return a.dependencyOrder - b.dependencyOrder;
      return b.priority - a.priority;
    })
    .map((p) => ({
      ...p,
      removed: false,
      localAssigneeId: p.proposedAssigneeId,
      localAssigneeName: p.proposedAssigneeName,
    }));
}

function buildLoadMap(
  rows: ProposalRowV2[],
  availableAssignees: AvailableAssigneeV2[]
): Map<string, AssigneeLoadEntry> {
  const map = new Map<string, AssigneeLoadEntry>();

  // Seed from availableAssignees so we have base data for everyone in proposals.
  for (const row of rows) {
    if (row.removed || !row.localAssigneeId) continue;
    const assignee = availableAssignees.find((a) => a.id === row.localAssigneeId);
    if (!assignee) continue;
    if (!map.has(assignee.id)) {
      map.set(assignee.id, {
        id: assignee.id,
        name: assignee.name,
        team: assignee.team,
        existingHours: assignee.committedHours,
        proposedHours: 0,
        capacityHours: assignee.capacityHours,
      });
    }
    const entry = map.get(assignee.id)!;
    entry.proposedHours += row.size ? SIZE_HOURS[row.size] : 0;
  }

  return map;
}

export function SprintPlanningModal({
  open,
  onClose,
  previewData,
}: SprintPlanningModalProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ProposalRowV2[]>(() =>
    initRows(previewData)
  );
  const [filter, setFilter] = useState<PlanningFilter>("ALL");
  const [committing, setCommitting] = useState(false);

  // Re-init rows when previewData changes (re-run).
  useEffect(() => {
    setRows(initRows(previewData));
    setFilter("ALL");
  }, [previewData]);

  function handleAssigneeChange(ticketId: string, assigneeId: string | null) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.ticketId !== ticketId) return r;
        const assignee = assigneeId
          ? previewData.availableAssignees.find((a) => a.id === assigneeId) ?? null
          : null;

        // Recompute flag based on new assignee load
        let newFlag = r.flag;
        if (assigneeId && assignee) {
          const proposedHours = r.size ? SIZE_HOURS[r.size] : 0;
          const totalAfter = assignee.committedHours + proposedHours;
          if (assignee.capacityHours !== null && totalAfter > assignee.capacityHours) {
            newFlag = "OVER_CAPACITY";
          } else {
            // Only reset to OK if it was previously OVER_CAPACITY (not UNASSIGNABLE)
            if (r.flag === "OVER_CAPACITY") newFlag = "OK";
          }
        }

        return {
          ...r,
          localAssigneeId: assigneeId,
          localAssigneeName: assignee?.name ?? null,
          flag: newFlag,
        };
      })
    );
  }

  function handleRemove(ticketId: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.ticketId === ticketId ? { ...r, removed: true } : r
      )
    );
  }

  function handleRestore(ticketId: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.ticketId === ticketId ? { ...r, removed: false } : r
      )
    );
  }

  // Derived counts
  const activeRows = rows.filter((r) => !r.removed);
  const okCount = activeRows.filter((r) => r.flag === "OK").length;
  const overCount = activeRows.filter((r) => r.flag === "OVER_CAPACITY").length;
  const unassignableCount = activeRows.filter((r) => r.flag === "UNASSIGNABLE").length;
  const removedCount = rows.filter((r) => r.removed).length;
  const approvableCount = activeRows.filter((r) => r.flag !== "UNASSIGNABLE").length;

  // Filter counts for pills
  const countsByFilter: Record<PlanningFilter, number> = {
    ALL: rows.length,
    OK: okCount,
    OVER_CAPACITY: overCount,
    UNASSIGNABLE: unassignableCount,
    REMOVED: removedCount,
  };

  // Visible rows based on current filter
  const visibleRows =
    filter === "REMOVED"
      ? rows.filter((r) => r.removed)
      : filter === "ALL"
      ? rows.filter((r) => !r.removed)
      : rows.filter((r) => !r.removed && r.flag === filter);

  // Live load map derived from current row state
  const loadMap = buildLoadMap(rows, previewData.availableAssignees);
  const loadEntries = Array.from(loadMap.values()).sort(
    (a, b) => b.proposedHours + b.existingHours - (a.proposedHours + a.existingHours)
  );

  async function handleApprove() {
    const assignments: CommitAssignment[] = activeRows
      .filter((r) => r.flag !== "UNASSIGNABLE")
      .map((r) => ({
        ticketId: r.ticketId,
        assigneeId: r.localAssigneeId,
        sprintId: previewData.targetSprint.id,
      }));

    if (assignments.length === 0) {
      notify.error("No assignable tickets to commit.");
      return;
    }

    setCommitting(true);
    try {
      const res = await fetch("/api/tickets/auto-assign/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        notify.error(json.error ?? "Commit failed");
        return;
      }
      const { data: result } = (await res.json()) as CommitResponse;

      if (result.errors.length > 0) {
        const failedIds = result.errors.map((e) => e.ticketId).join(", ");
        notify.error(
          `${result.updatedCount} assigned, ${result.errors.length} failed: ${failedIds}`
        );
        // Mark failed rows so user can see them
        return;
      }

      const notified = result.notifiedCount ?? 0;
      notify.success(
        `${result.updatedCount} ticket${result.updatedCount !== 1 ? "s" : ""} assigned to ${previewData.targetSprint.name}.${notified > 0 ? ` ${notified} team member${notified !== 1 ? "s" : ""} notified.` : ""}`
      );
      onClose();
      router.refresh();
    } catch {
      notify.error("Failed to commit assignments");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !committing) onClose();
      }}
    >
      <DialogContent
        className="w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden p-0"
        showCloseButton={!committing}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <DialogTitle className="text-lg">
                Plan {previewData.targetSprint.name}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {rows.length} proposal{rows.length !== 1 ? "s" : ""}
                {previewData.skippedTickets.length > 0 &&
                  ` · ${previewData.skippedTickets.length} skipped`}
              </DialogDescription>
            </div>
          </div>

          {/* Filter bar */}
          <div
            className="flex flex-wrap gap-1.5 mt-3"
            role="group"
            aria-label="Filter proposals"
          >
            {FILTER_OPTIONS.map(({ key, label }) => {
              const count = countsByFilter[key];
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                  aria-pressed={active}
                >
                  {label}
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold min-w-[18px]",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Two-panel body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left panel: proposals */}
          <div className="flex-[3] min-w-0 overflow-y-auto border-r px-4 py-4 space-y-2">
            {visibleRows.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-foreground">
                  No proposals match this filter
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try switching to "All" to see all proposals.
                </p>
              </div>
            ) : (
              visibleRows.map((row) => (
                <ProposalCard
                  key={row.ticketId}
                  row={row}
                  availableAssignees={previewData.availableAssignees}
                  onAssigneeChange={handleAssigneeChange}
                  onRemove={handleRemove}
                  onRestore={handleRestore}
                />
              ))
            )}

            {/* Skipped tickets section */}
            {previewData.skippedTickets.length > 0 && filter === "ALL" && (
              <div className="mt-4">
                <SkippedTicketsList skippedTickets={previewData.skippedTickets} />
              </div>
            )}
          </div>

          {/* Right panel: assignee load */}
          <div className="flex-[2] min-w-0 overflow-y-auto px-4 py-4">
            <p className="text-sm font-semibold mb-4">Assignee Load Impact</p>
            <AssigneeLoadPanel
              assignees={loadEntries}
              skillGapWarnings={previewData.skillGapWarnings}
            />

            {/* Summary stats */}
            <div className="mt-6 space-y-1 pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Summary
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{approvableCount}</span> will be assigned
              </p>
              {overCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  <span className="font-medium">{overCount}</span> over capacity
                </p>
              )}
              {unassignableCount > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  <span className="font-medium">{unassignableCount}</span> unassignable
                </p>
              )}
              {removedCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{removedCount}</span> removed
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground hidden sm:block">
            {approvableCount} assigned
            {overCount > 0 && `, ${overCount} over capacity`}
            {unassignableCount > 0 && `, ${unassignableCount} unassignable`}
            {removedCount > 0 && `, ${removedCount} removed`}
          </p>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={committing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleApprove()}
              disabled={committing || approvableCount === 0}
            >
              {committing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />
                  Committing…
                </>
              ) : (
                `Approve Assignments (${approvableCount})`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
