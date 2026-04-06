// SPEC: auto-assign-v2.md
"use client";

import { useState, useEffect } from "react";
import { Team } from "@prisma/client";
import { isTeamLead as checkIsTeamLead } from "@/lib/role-helpers";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { TEAM_LABELS } from "@/lib/constants";
import { AutoAssignConfig, ALL_TEAMS } from "./auto-assign-types";

interface AutoAssignConfigSheetProps {
  open: boolean;
  onClose: () => void;
  sprintId: string;
  sprintName: string;
  userRole: string;
  userTeam: string | null;
  onPreviewReady: (config: AutoAssignConfig) => Promise<void>;
  loading: boolean;
}

export function AutoAssignConfigSheet({
  open,
  onClose,
  sprintName,
  userRole,
  userTeam,
  onPreviewReady,
  loading,
}: AutoAssignConfigSheetProps) {
  const isTeamLead = checkIsTeamLead(userRole);

  // For team leads: locked to their own team. For admins: full selection.
  const availableTeams = isTeamLead && userTeam
    ? ALL_TEAMS.filter((t) => t === userTeam)
    : ALL_TEAMS;

  const [selectedTeams, setSelectedTeams] = useState<Set<Team>>(
    new Set(availableTeams)
  );
  const [ignoreCapacity, setIgnoreCapacity] = useState(false);
  const [includeBacklog, setIncludeBacklog] = useState(true);
  const [includeFlagged, setIncludeFlagged] = useState(true);
  const [prioritizeCarryover, setPrioritizeCarryover] = useState(false);

  // Reset state to defaults whenever the sheet is opened
  useEffect(() => {
    if (open) {
      setSelectedTeams(new Set(availableTeams));
      setIgnoreCapacity(false);
      setIncludeBacklog(true);
      setIncludeFlagged(true);
      setPrioritizeCarryover(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleTeam(team: Team) {
    if (isTeamLead) return; // read-only for team leads
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) {
        next.delete(team);
      } else {
        next.add(team);
      }
      return next;
    });
  }

  async function handleRun() {
    if (selectedTeams.size === 0) return;
    const includeStatuses: string[] = [];
    if (includeBacklog) includeStatuses.push("BACKLOG");
    if (includeFlagged) includeStatuses.push("TODO");
    await onPreviewReady({
      teams: Array.from(selectedTeams),
      ignoreCapacity,
      includeStatuses,
      prioritizeCarryover,
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col">
        <SheetHeader>
          <SheetTitle>Auto-assign Backlog</SheetTitle>
          <SheetDescription>
            Configure which teams to include and whether to respect capacity
            limits, then run the preview.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-6 py-2">
          {/* Target sprint display */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Target sprint
            </p>
            <p className="text-sm font-medium">{sprintName}</p>
          </div>

          {/* Teams to include */}
          <div className="space-y-2">
            <p
              id="auto-assign-teams-label"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              Teams to include
            </p>
            {isTeamLead && (
              <p className="text-xs text-muted-foreground">
                As a Team Lead, you can only run auto-assign for your own team.
              </p>
            )}
            <div
              className="space-y-2"
              role="group"
              aria-labelledby="auto-assign-teams-label"
            >
              {availableTeams.map((team) => {
                const checked = selectedTeams.has(team);
                return (
                  <label
                    key={team}
                    className="flex items-center gap-2.5 cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleTeam(team)}
                      disabled={isTeamLead}
                      aria-label={`Include ${TEAM_LABELS[team]} team`}
                    />
                    <span className="text-sm">{TEAM_LABELS[team]}</span>
                  </label>
                );
              })}
            </div>
            {selectedTeams.size === 0 && (
              <p className="text-xs text-destructive" role="alert">
                Select at least one team to run the preview.
              </p>
            )}
          </div>

          {/* Ignore capacity toggle */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Capacity limits
            </p>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              {/* Using a checkbox styled as a toggle since Switch is not installed */}
              <Checkbox
                checked={ignoreCapacity}
                onCheckedChange={(checked) =>
                  setIgnoreCapacity(checked === true)
                }
                aria-label="Ignore capacity limits"
              />
              <span className="text-sm">Ignore capacity limits</span>
            </label>
            {ignoreCapacity && (
              <div
                className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                role="alert"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Assignments may exceed team member capacity limits.
                </span>
              </div>
            )}
          </div>

          {/* Source tickets */}
          <div className="space-y-2">
            <span
              id="auto-assign-sources-label"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider block"
            >
              Source tickets
            </span>
            <div
              className="space-y-2"
              role="group"
              aria-labelledby="auto-assign-sources-label"
            >
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={includeBacklog}
                  onCheckedChange={(checked) => setIncludeBacklog(checked === true)}
                  aria-label="Include Backlog tickets"
                />
                <span className="text-sm">Include Backlog</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={includeFlagged}
                  onCheckedChange={(checked) => setIncludeFlagged(checked === true)}
                  aria-label="Include Prioritized tickets"
                />
                <span className="text-sm">Include Prioritized</span>
              </label>
            </div>
            {!includeBacklog && !includeFlagged && (
              <p className="text-xs text-destructive" role="alert">
                Select at least one ticket source to run the preview.
              </p>
            )}
          </div>

          {/* Carryover prioritisation */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Carryover
            </p>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <Checkbox
                checked={prioritizeCarryover}
                onCheckedChange={(checked) =>
                  setPrioritizeCarryover(checked === true)
                }
                aria-label="Prioritize carryover tickets"
              />
              <span className="text-sm">Prioritize carryover tickets</span>
            </label>
            <p className="text-xs text-muted-foreground">
              When enabled, tickets carried over from the previous sprint are
              sorted to the top of the assignment queue.
            </p>
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleRun()}
            disabled={loading || selectedTeams.size === 0 || (!includeBacklog && !includeFlagged)}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />
                Running…
              </>
            ) : (
              "Run Auto-assign"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
