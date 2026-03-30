// SPEC: brief-to-epic-workflow.md
// SPEC: design-improvements.md
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { notify } from "@/lib/toast";

export interface CarryoverSuggestion {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DISMISSED";
  ticket: {
    id: string;
    title: string;
    team: string;
    status: string;
    size?: string | null;
  };
  toSprint?: { id: string; name: string } | null;
}

interface Props {
  sprintId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: CarryoverSuggestion[];
  availableSprints: { id: string; name: string }[];
  onRefresh: () => void;
}

// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
const TEAM_BADGE: Record<string, string> = {
  CONTENT: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20",
  DESIGN:  "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20",
  SEO:     "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20",
  WEM:     "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/20",
};

export function SprintCarryoverModal({
  sprintId,
  open,
  onOpenChange,
  suggestions,
  availableSprints,
  onRefresh,
}: Props) {
  // Track locally-resolved suggestion IDs so rows grey out immediately
  const [resolved, setResolved] = useState<Record<string, "ACCEPTED" | "DISMISSED">>({});
  const [selectedSprint, setSelectedSprint] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const pendingCount = suggestions.filter((s) => !resolved[s.id]).length;
  const allDone = pendingCount === 0;

  async function handleAction(
    suggestionId: string,
    action: "ACCEPT" | "DISMISS"
  ) {
    const toSprintId = action === "ACCEPT" ? selectedSprint[suggestionId] : undefined;
    setLoading((prev) => ({ ...prev, [suggestionId]: true }));
    try {
      const res = await fetch(`/api/sprints/${sprintId}/carryover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId, action, toSprintId }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        notify.error(json.error ?? "Failed to update carryover");
        return;
      }
      setResolved((prev) => ({ ...prev, [suggestionId]: action === "ACCEPT" ? "ACCEPTED" : "DISMISSED" }));
      onRefresh();
    } catch {
      notify.error("Network error — please try again");
    } finally {
      setLoading((prev) => ({ ...prev, [suggestionId]: false }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby="carryover-desc">
        <DialogHeader>
          <DialogTitle>
            Sprint Carryover — {pendingCount} ticket{pendingCount !== 1 ? "s" : ""} to resolve
          </DialogTitle>
          <p id="carryover-desc" className="text-sm text-muted-foreground mt-1">
            These tickets were not completed. Assign them to a sprint or dismiss.
          </p>
        </DialogHeader>

        {allDone ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden />
            <p className="font-medium text-green-700">All tickets resolved!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {suggestions.map((s) => {
              const isResolved = !!resolved[s.id];
              const teamColor = TEAM_BADGE[s.ticket.team] ?? "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20";
              const isLoading = !!loading[s.id];

              return (
                <div
                  key={s.id}
                  className={`rounded-lg border p-3 transition-opacity ${isResolved ? "opacity-40" : ""}`}
                  aria-disabled={isResolved}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="flex-1 text-sm font-medium leading-snug">{s.ticket.title}</span>
                    <Badge className={`shrink-0 text-xs border-0 ${teamColor}`}>
                      {s.ticket.team}
                    </Badge>
                    {s.ticket.size && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {s.ticket.size}
                      </Badge>
                    )}
                  </div>

                  {!isResolved && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        value={selectedSprint[s.id] ?? ""}
                        onChange={(e) =>
                          setSelectedSprint((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        aria-label="Assign to sprint"
                        disabled={isLoading}
                      >
                        <option value="">No sprint (backlog)</option>
                        {availableSprints.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        disabled={isLoading}
                        onClick={() => handleAction(s.id, "ACCEPT")}
                      >
                        {isLoading ? "Saving…" : "Accept"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={isLoading}
                        onClick={() => handleAction(s.id, "DISMISS")}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}

                  {isResolved && (
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {resolved[s.id]?.toLowerCase()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
