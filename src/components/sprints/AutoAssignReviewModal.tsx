// SPEC: auto-assign.md
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AutoAssignRow, ProposalRow, AssigneeOption } from "./AutoAssignRow";
import { notify } from "@/lib/toast";
import { Loader2 } from "lucide-react";

interface AutoAssignReviewModalProps {
  open: boolean;
  onClose: () => void;
  proposals: ProposalRow[];
  availableAssignees: AssigneeOption[];
  targetSprint: { id: string; name: string };
}

interface CommitAssignment {
  ticketId: string;
  assigneeId: string | null;
  sprintId: string;
}

interface CommitResponse {
  data: {
    updatedCount: number;
    errors: { ticketId: string; message: string }[];
  };
}

export function AutoAssignReviewModal({
  open,
  onClose,
  proposals,
  availableAssignees,
  targetSprint,
}: AutoAssignReviewModalProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ProposalRow[]>(proposals);
  const [committing, setCommitting] = useState(false);

  // BUG-16: Reset rows whenever the parent passes fresh proposals (re-run).
  useEffect(() => {
    setRows(proposals);
  }, [proposals]);

  function handleAssigneeChange(ticketId: string, assigneeId: string | null) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.ticketId !== ticketId) return r;
        const assignee = assigneeId
          ? availableAssignees.find((a) => a.id === assigneeId) ?? null
          : null;
        return {
          ...r,
          proposedAssigneeId: assigneeId,
          proposedAssigneeName: assignee?.name ?? null,
        };
      })
    );
  }

  async function handleApprove() {
    const assignments: CommitAssignment[] = rows
      .filter((r) => r.flag !== "UNASSIGNABLE")
      .map((r) => ({
        ticketId: r.ticketId,
        assigneeId: r.proposedAssigneeId,
        sprintId: targetSprint.id,
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
      const msg =
        result.errors.length > 0
          ? `${result.updatedCount} assigned, ${result.errors.length} failed`
          : `${result.updatedCount} ticket${result.updatedCount !== 1 ? "s" : ""} assigned to sprint`;
      notify.success(msg);
      onClose();
      router.refresh();
    } catch {
      notify.error("Failed to commit assignments");
    } finally {
      setCommitting(false);
    }
  }

  // BUG-18: Only count tickets that are both assignable and have a chosen assignee.
  const assignableCount = rows.filter(
    (r) => r.flag !== "UNASSIGNABLE" && r.proposedAssigneeId !== null
  ).length;
  // Tickets added to the sprint without an assignee (user cleared the select).
  const noAssigneeCount = rows.filter(
    (r) => r.flag !== "UNASSIGNABLE" && r.proposedAssigneeId === null
  ).length;
  const unassignableCount = rows.filter((r) => r.flag === "UNASSIGNABLE").length;
  // Total going into the sprint (for enabling the Approve button).
  const sprintableCount = assignableCount + noAssigneeCount;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !committing) onClose(); }}>
      <DialogContent
        className="sm:max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        showCloseButton={!committing}
      >
        <DialogHeader>
          <DialogTitle>
            Review Auto-Assignments — {targetSprint.name}
          </DialogTitle>
          <DialogDescription>
            Review and edit before committing. Changes to assignees are applied
            per row.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable table area */}
        <div className="flex-1 overflow-auto min-h-0 rounded border">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
              <tr className="border-b">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">
                  Ticket
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">
                  Team
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">
                  Skillset
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">
                  Assignee
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">
                  Sprint
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">
                  Size
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <AutoAssignRow
                  key={row.ticketId}
                  row={row}
                  sprintName={targetSprint.name}
                  availableAssignees={availableAssignees}
                  onAssigneeChange={handleAssigneeChange}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary + footer */}
        <div className="pt-2 text-xs text-muted-foreground shrink-0 space-y-0.5">
          <span>
            {assignableCount} ticket{assignableCount !== 1 ? "s" : ""} will be
            assigned
            {noAssigneeCount > 0
              ? `, ${noAssigneeCount} added to sprint without an assignee`
              : ""}
            {unassignableCount > 0
              ? `, ${unassignableCount} unassignable`
              : ""}
            .
          </span>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={committing}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleApprove()}
            disabled={committing || sprintableCount === 0}
          >
            {committing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Committing…
              </>
            ) : (
              `Approve All (${sprintableCount})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
