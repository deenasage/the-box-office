// SPEC: handoffs
"use client";

import { useState } from "react";
import { TicketStatus, Team } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { notify } from "@/lib/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TicketRef {
  id: string;
  title: string;
  status: TicketStatus;
  team: Team;
  sprint: { id: string; name: string; startDate: string } | null;
}

export interface HandoffChecklistItem {
  handoffId: string;
  blocker: TicketRef;
  dependent: TicketRef;
}

// ── ChecklistRow ──────────────────────────────────────────────────────────────

function ChecklistRow({
  item,
  nextSprintId,
  nextSprintName,
}: {
  item: HandoffChecklistItem;
  nextSprintId: string | null;
  nextSprintName: string | null;
}) {
  const [assigning, setAssigning] = useState(false);
  const [assignedSprintName, setAssignedSprintName] = useState<string | null>(null);

  const isAssigned = assignedSprintName !== null;

  async function handleAssign() {
    if (!nextSprintId || !nextSprintName) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/tickets/${item.dependent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId: nextSprintId }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        notify.error(json.error ?? "Failed to assign ticket to sprint");
        return;
      }
      setAssignedSprintName(nextSprintName);
      notify.success(`"${item.dependent.title}" assigned to ${nextSprintName}`);
    } catch {
      notify.error("Network error — please try again");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b last:border-0 border-border">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TeamBadge team={item.dependent.team} className="shrink-0" />
        <span className="text-sm text-foreground truncate" title={item.dependent.title}>
          {item.dependent.title}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isAssigned ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {assignedSprintName}
          </span>
        ) : (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            not yet scheduled
          </span>
        )}
        {!isAssigned && nextSprintId && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleAssign}
            disabled={assigning}
            className="h-7 text-xs"
            aria-label={`Assign "${item.dependent.title}" to next sprint`}
          >
            {assigning ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              "Assign to next sprint"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── HandoffChecklist ──────────────────────────────────────────────────────────

interface HandoffChecklistProps {
  items: HandoffChecklistItem[];
  nextSprintId: string | null;
  nextSprintName: string | null;
}

export function HandoffChecklist({ items, nextSprintId, nextSprintName }: HandoffChecklistProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-3">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
        Handoff checklist — {items.length} dependent ticket{items.length !== 1 ? "s" : ""} not yet scheduled
      </p>
      <div>
        {items.map((item) => (
          <ChecklistRow
            key={item.handoffId}
            item={item}
            nextSprintId={nextSprintId}
            nextSprintName={nextSprintName}
          />
        ))}
      </div>
    </div>
  );
}
