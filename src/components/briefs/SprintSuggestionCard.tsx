// SPEC: design-improvements.md
// SPEC: capacity-ai.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEAM_LABELS } from "@/lib/constants";
import type { Team } from "@prisma/client";

interface TeamBreakdown {
  team: string;
  currentCapacityPoints: number;
  currentCommittedPoints: number;
  incomingPoints: number;
  projectedLoadPct: number;
  loadStatus: "FITS" | "TIGHT" | "OVERLOADED";
  suggestedAssignee: string | null;
  suggestedAssigneeName: string | null;
  availabilityPoints: number;
}

export interface SprintScenario {
  sprintId: string;
  sprintName: string;
  feasibility: "FITS" | "TIGHT" | "OVERLOADED";
  teamBreakdowns: TeamBreakdown[];
  risks: string[];
}

const FEASIBILITY_STYLES: Record<SprintScenario["feasibility"], string> = {
  FITS: "bg-[#008146]/10 text-[#008146] border-[#008146]/30",
  TIGHT: "bg-amber-50 text-amber-700 border-amber-200",
  OVERLOADED: "bg-red-50 text-red-700 border-red-200",
};

const LOAD_DOT: Record<TeamBreakdown["loadStatus"], string> = {
  FITS: "bg-[#008146]",
  TIGHT: "bg-amber-500",
  OVERLOADED: "bg-red-500",
};

export interface SprintSuggestionCardProps {
  scenario: SprintScenario;
  isRecommended: boolean;
  isExpanded: boolean;
  canApply: boolean;
  applying: boolean;
  onToggleExpand: (sprintId: string) => void;
  onApply: (sprintId: string) => void;
}

export function SprintSuggestionCard({
  scenario,
  isRecommended,
  isExpanded,
  canApply,
  applying,
  onToggleExpand,
  onApply,
}: SprintSuggestionCardProps) {
  const activeTeams = scenario.teamBreakdowns.filter(
    (t) => t.incomingPoints > 0 || t.currentCommittedPoints > 0
  );

  return (
    <div
      className={cn(
        "rounded-lg border",
        isRecommended && "border-primary/40"
      )}
    >
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        onClick={() => onToggleExpand(scenario.sprintId)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{scenario.sprintName}</span>
          <Badge
            variant="outline"
            className={cn("text-xs", FEASIBILITY_STYLES[scenario.feasibility])}
          >
            {scenario.feasibility}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {canApply && !isRecommended && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={(e) => { e.stopPropagation(); onApply(scenario.sprintId); }}
              disabled={applying}
            >
              Choose this sprint
            </Button>
          )}
          {isExpanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          }
        </div>
      </button>

      {isExpanded && (
        <div className="border-t px-3 py-2.5 space-y-3">
          {/* Team breakdown table */}
          {activeTeams.length > 0 && (
            <div className="space-y-1">
              <div className="grid grid-cols-5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide px-1">
                <span>Team</span>
                <span className="text-right">Capacity</span>
                <span className="text-right">Committed</span>
                <span className="text-right">Incoming</span>
                <span className="text-right">Load</span>
              </div>
              {activeTeams.map((t) => (
                <div
                  key={t.team}
                  className="grid grid-cols-5 text-xs px-1 py-0.5 rounded hover:bg-muted/50"
                >
                  <span className="font-medium text-muted-foreground">{TEAM_LABELS[t.team as Team] ?? t.team}</span>
                  <span className="text-right">{t.currentCapacityPoints}h</span>
                  <span className="text-right">{t.currentCommittedPoints}h</span>
                  <span className="text-right">+{t.incomingPoints}h</span>
                  <span className="text-right flex items-center justify-end gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", LOAD_DOT[t.loadStatus])} />
                    {t.projectedLoadPct}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Risks */}
          {scenario.risks.length > 0 && (
            <ul className="space-y-1">
              {scenario.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
