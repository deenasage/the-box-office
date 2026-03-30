// SPEC: portfolio-view.md
"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { EPIC_STATUS_LABELS } from "./portfolio-types";
import type { SprintSummary } from "@/types";
import { TEAM_LABELS } from "@/lib/constants";
import type { Team } from "@prisma/client";

const ALL_TEAMS = ["CONTENT", "DESIGN", "SEO", "WEM", "PAID_MEDIA", "ANALYTICS"];
const ALL_STATUSES = ["INTAKE", "IN_BRIEF", "BRIEFED", "IN_PLANNING", "IN_PROGRESS", "DONE", "ON_HOLD", "CANCELLED"];
const DEFAULT_STATUSES = ["INTAKE", "IN_BRIEF", "BRIEFED", "IN_PLANNING", "IN_PROGRESS", "DONE", "ON_HOLD"];

interface PortfolioFiltersProps {
  team: string;
  statuses: string[];
  sprintId: string;
  onTeamChange: (v: string) => void;
  onStatusesChange: (v: string[]) => void;
  onSprintChange: (v: string) => void;
}

export function PortfolioFilters({
  team, statuses, sprintId,
  onTeamChange, onStatusesChange, onSprintChange,
}: PortfolioFiltersProps) {
  const [sprints, setSprints] = useState<SprintSummary[]>([]);
  const [sprintsError, setSprintsError] = useState(false);

  function loadSprints() {
    setSprintsError(false);
    fetch("/api/sprints")
      .then((r) => r.json())
      .then((res: { data: SprintSummary[] }) => setSprints(res.data ?? []))
      .catch(() => setSprintsError(true));
  }

  useEffect(() => { loadSprints(); }, []);

  function toggleStatus(s: string) {
    if (statuses.includes(s)) {
      onStatusesChange(statuses.filter((x) => x !== s));
    } else {
      onStatusesChange([...statuses, s]);
    }
  }

  function resetStatuses() {
    onStatusesChange(DEFAULT_STATUSES);
  }

  const isDefault = DEFAULT_STATUSES.length === statuses.length && DEFAULT_STATUSES.every(s => statuses.includes(s));
  const statusLabel =
    statuses.length === ALL_STATUSES.length || isDefault ? "All Statuses"
    : statuses.length === 0 ? "No Statuses"
    : statuses.length === 1 ? (EPIC_STATUS_LABELS[statuses[0]] ?? statuses[0])
    : `${statuses.length} statuses`;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Team filter */}
      <Select value={team} onValueChange={(v) => onTeamChange(v ?? "ALL")}>
        <SelectTrigger className="w-40 h-9 text-sm">
          <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
            {team && team !== "ALL" ? (TEAM_LABELS[team as Team] ?? team) : "All Teams"}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Teams</SelectItem>
          {ALL_TEAMS.map((t) => (
            <SelectItem key={t} value={t}>{TEAM_LABELS[t as Team]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status multi-select */}
      <Popover>
        <PopoverTrigger
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted transition-colors"
          aria-label="Filter by status"
        >
          {statusLabel}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3" align="start">
          <div className="space-y-2">
            {ALL_STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <Checkbox
                  id={`status-${s}`}
                  checked={statuses.includes(s)}
                  onCheckedChange={() => toggleStatus(s)}
                />
                <Label htmlFor={`status-${s}`} className="text-sm cursor-pointer">
                  {EPIC_STATUS_LABELS[s] ?? s}
                </Label>
              </div>
            ))}
            <div className="pt-1 border-t">
              <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={resetStatuses}>
                Reset to defaults
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sprint filter */}
      {sprintsError ? (
        <span className="text-xs text-muted-foreground">
          Failed to load filters.{" "}
          <button
            onClick={loadSprints}
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Retry
          </button>
        </span>
      ) : (
        <Select value={sprintId} onValueChange={(v) => onSprintChange(v ?? "ALL")}>
          <SelectTrigger className="w-45 h-9 text-sm">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
              {sprintId && sprintId !== "ALL" ? (sprints.find(s => s.id === sprintId)?.name ?? sprintId) : "All Sprints"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sprints</SelectItem>
            {sprints.map((sp) => (
              <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
