// SPEC: auto-assign-v2.md
"use client";

import { X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { SizeBadge } from "@/components/tickets/SizeBadge";
import { cn } from "@/lib/utils";
import { SIZE_HOURS } from "@/lib/utils";
import { ProposalRowV2, AvailableAssigneeV2 } from "./auto-assign-types";
import { PRIORITY_LABELS, PRIORITY_BADGE_STYLES } from "@/lib/constants";

interface ProposalCardProps {
  row: ProposalRowV2;
  availableAssignees: AvailableAssigneeV2[];
  onAssigneeChange: (ticketId: string, assigneeId: string | null) => void;
  onRemove: (ticketId: string) => void;
  onRestore: (ticketId: string) => void;
}

const FLAG_BORDER: Record<string, string> = {
  OK: "border-border",
  OVER_CAPACITY: "border-amber-300 dark:border-amber-700",
  UNASSIGNABLE: "border-red-300 dark:border-red-700",
};

const FLAG_BG: Record<string, string> = {
  OK: "",
  OVER_CAPACITY: "bg-amber-50/50 dark:bg-amber-950/10",
  UNASSIGNABLE: "bg-red-50/50 dark:bg-red-950/10",
};

function FlagChip({ flag }: { flag: "OK" | "OVER_CAPACITY" | "UNASSIGNABLE" }) {
  if (flag === "OK") {
    return (
      <Badge
        variant="outline"
        className="text-[11px] text-[#008146] border-[#008146]/30 bg-[#008146]/10 dark:text-[#00D93A] dark:border-[#00D93A]/30 dark:bg-[#00D93A]/10"
      >
        OK
      </Badge>
    );
  }
  if (flag === "OVER_CAPACITY") {
    return (
      <Badge
        variant="outline"
        className="text-[11px] text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:bg-amber-950/30"
      >
        Over Capacity
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[11px] text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-700 dark:bg-red-950/30"
    >
      No Match
    </Badge>
  );
}

export function ProposalCard({
  row,
  availableAssignees,
  onAssigneeChange,
  onRemove,
  onRestore,
}: ProposalCardProps) {
  // Team members who hold the required skillset (if any).
  const teamMembers = availableAssignees.filter((a) => a.team === row.team);

  const eligibleMembers = row.requiredSkillsetId
    ? teamMembers.filter((a) =>
        a.skillsets.some((s) => s.id === row.requiredSkillsetId)
      )
    : teamMembers;

  const nonEligibleMembers = row.requiredSkillsetId
    ? teamMembers.filter(
        (a) => !a.skillsets.some((s) => s.id === row.requiredSkillsetId)
      )
    : [];

  // Sort each group: least loaded first.
  const sortByLoad = (a: AvailableAssigneeV2, b: AvailableAssigneeV2) =>
    a.committedHours - b.committedHours;
  const sortedEligible = [...eligibleMembers].sort(sortByLoad);
  const sortedNonEligible = [...nonEligibleMembers].sort(sortByLoad);

  function assigneeLabel(a: AvailableAssigneeV2): string {
    const cap = a.capacityHours;
    return cap !== null
      ? `${a.name}  ·  ${a.committedHours}h / ${cap}h`
      : `${a.name}  ·  ${a.committedHours}h`;
  }

  const currentHours = row.size ? SIZE_HOURS[row.size] : 0;
  const totalAfter = row.committedHoursAfter;


  if (row.removed) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="text-sm text-muted-foreground truncate line-through"
            title={row.ticketTitle}
          >
            {row.ticketTitle}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <TeamBadge team={row.team} className="text-[10px] px-1.5 py-0" />
            <SizeBadge size={row.size} />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-7 px-2 text-xs"
          onClick={() => onRestore(row.ticketId)}
          aria-label={`Restore proposal for: ${row.ticketTitle}`}
        >
          <RotateCcw className="h-3 w-3 mr-1" aria-hidden="true" />
          Restore
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2.5 relative",
        FLAG_BORDER[row.flag],
        FLAG_BG[row.flag]
      )}
    >
      {/* Header row: title + remove button */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {row.priority > 0 && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                  PRIORITY_BADGE_STYLES[row.priority]
                )}
                aria-label={`Priority: ${PRIORITY_LABELS[row.priority]}`}
              >
                {PRIORITY_LABELS[row.priority]}
              </span>
            )}
            <a
              href={`/tickets/${row.ticketId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline underline-offset-2 truncate"
              title={row.ticketTitle}
            >
              {row.ticketTitle.length > 60
                ? `${row.ticketTitle.slice(0, 60)}…`
                : row.ticketTitle}
            </a>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 h-6 w-6 text-muted-foreground hover:text-foreground -mt-0.5 -mr-1"
          onClick={() => onRemove(row.ticketId)}
          aria-label={`Remove ${row.ticketTitle} from plan`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <TeamBadge team={row.team} className="text-[10px] px-1.5 py-0" />
        <SizeBadge size={row.size} />
        {row.requiredSkillsetName && (
          <Badge
            variant="secondary"
            className="text-[11px] px-1.5 py-0"
          >
            {row.requiredSkillsetName}
          </Badge>
        )}
        <FlagChip flag={row.flag} />
      </div>

      {/* Assignee dropdown */}
      <div>
        {row.flag === "UNASSIGNABLE" ? (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            No eligible assignee found
          </p>
        ) : (
          <Select
            value={row.localAssigneeId ?? "__none__"}
            onValueChange={(v) =>
              onAssigneeChange(row.ticketId, v === "__none__" ? null : v)
            }
          >
            <SelectTrigger
              size="sm"
              className="w-full text-xs"
              aria-label="Assign to"
            >
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground">Unassigned</span>
              </SelectItem>

              {sortedEligible.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {assigneeLabel(a)}
                </SelectItem>
              ))}

              {sortedNonEligible.length > 0 && (
                <>
                  {/* Disabled group header for non-matching members */}
                  <SelectItem value="__sep__" disabled>
                    <span className="text-[11px] text-muted-foreground">
                      — No {row.requiredSkillsetName} skillset
                    </span>
                  </SelectItem>
                  {sortedNonEligible.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span title={`Warning: ${a.name} does not hold ${row.requiredSkillsetName ?? "the required skillset"}`}>
                        {assigneeLabel(a)}
                      </span>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Match reason */}
      {row.matchReason && (
        <p className="text-[11px] text-muted-foreground italic">
          {row.matchReason}
        </p>
      )}

      {/* Hours impact */}
      {row.size && (
        <p className="text-[11px] text-muted-foreground tabular-nums">
          +{currentHours}h →{" "}
          {row.capacityHours !== null
            ? `${totalAfter}h committed / ${row.capacityHours}h capacity`
            : `${totalAfter}h committed (no cap set)`}
        </p>
      )}
    </div>
  );
}
