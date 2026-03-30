// SPEC: auto-assign-v2.md
"use client";

import { Team } from "@prisma/client";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkillGapWarning } from "./auto-assign-types";

export interface AssigneeLoadEntry {
  id: string;
  name: string;
  team: Team;
  existingHours: number;   // hours already committed before this preview run
  proposedHours: number;   // hours added by current non-removed proposals
  capacityHours: number | null;
}

interface AssigneeLoadPanelProps {
  assignees: AssigneeLoadEntry[];
  skillGapWarnings: SkillGapWarning[];
}

function loadColor(pct: number): string {
  if (pct > 100) return "bg-red-500";
  if (pct > 80) return "bg-amber-500";
  return "bg-[#008146]";
}

function loadTextColor(pct: number): string {
  if (pct > 100) return "text-red-700 dark:text-red-400";
  if (pct > 80) return "text-amber-700 dark:text-amber-400";
  return "text-[#008146] dark:text-[#00D93A]";
}

export function AssigneeLoadPanel({
  assignees,
  skillGapWarnings,
}: AssigneeLoadPanelProps) {
  if (assignees.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No assignees in current proposals.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assignees.map((a) => {
        const total = a.existingHours + a.proposedHours;
        const cap = a.capacityHours;
        const pct = cap !== null && cap > 0 ? Math.round((total / cap) * 100) : null;
        const existingPct = cap !== null && cap > 0
          ? Math.min(100, Math.round((a.existingHours / cap) * 100))
          : null;
        const proposedPct = cap !== null && cap > 0
          ? Math.min(100 - (existingPct ?? 0), Math.round((a.proposedHours / cap) * 100))
          : null;
        const isOver = pct !== null && pct > 100;

        return (
          <div key={a.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-medium truncate">{a.name}</span>
                <TeamBadge team={a.team} className="text-[10px] px-1.5 py-0" />
              </div>
              {pct !== null && (
                <span
                  className={cn("text-xs font-medium tabular-nums shrink-0", loadTextColor(pct))}
                >
                  {pct}%
                </span>
              )}
            </div>

            {/* Two-segment load bar: existing (muted) + proposed (brand color) */}
            <div
              className="w-full bg-muted rounded-full h-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={pct ?? total}
              aria-valuemin={0}
              aria-valuemax={cap ?? total}
              aria-label={`${a.name} load: ${total}h${cap ? ` / ${cap}h` : ""}`}
            >
              <div className="flex h-full">
                {existingPct !== null && existingPct > 0 && (
                  <div
                    className="h-full bg-muted-foreground/30 rounded-l-full"
                    style={{ width: `${existingPct}%` }}
                  />
                )}
                {proposedPct !== null && proposedPct > 0 && (
                  <div
                    className={cn("h-full", loadColor(pct ?? 0))}
                    style={{ width: `${proposedPct}%` }}
                  />
                )}
                {/* No-cap: fill entirely with proposed color */}
                {cap === null && a.proposedHours > 0 && (
                  <div className="h-full bg-[#008146] rounded-full" style={{ width: "100%" }} />
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground tabular-nums">
              {a.existingHours}h existing
              {a.proposedHours > 0 && ` + ${a.proposedHours}h proposed`}
              {" = "}{total}h
              {cap !== null ? ` / ${cap}h capacity` : " (no cap set)"}
            </p>

            {isOver && (
              <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Over capacity
              </p>
            )}
          </div>
        );
      })}

      {skillGapWarnings.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Skill Gap Warnings
          </p>
          {skillGapWarnings.map((w) => (
            <div
              key={w.skillsetId}
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              role="alert"
            >
              <p className="font-medium">{w.skillsetName}</p>
              <p>
                {w.ticketCount} ticket{w.ticketCount !== 1 ? "s" : ""},{" "}
                {w.holderCount} holder{w.holderCount !== 1 ? "s" : ""}.
                {w.warning === "BOTTLENECK" && " Bottleneck risk."}
                {w.warning === "NO_HOLDER" && " No one holds this skillset."}
              </p>
              {w.totalHoursRequired !== undefined && w.totalCapacityHours !== undefined && (
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                  {w.totalHoursRequired}h required, {w.totalCapacityHours}h available.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
