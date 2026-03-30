// SPEC: auto-assign.md
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SizeBadge } from "@/components/tickets/SizeBadge";
import { Team, TicketSize } from "@prisma/client";
import { TEAM_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface ProposalRow {
  ticketId: string;
  ticketTitle: string;
  team: Team;
  size: TicketSize;
  requiredSkillset: { id: string; name: string; color: string } | null;
  proposedAssigneeId: string | null;
  proposedAssigneeName: string | null;
  proposedSprintId: string;
  committedHoursAfter: number;
  capacityHours: number | null;
  flag: "OK" | "OVER_CAPACITY" | "UNASSIGNABLE";
}

export interface AssigneeOption {
  id: string;
  name: string;
  team: Team;
}

interface AutoAssignRowProps {
  row: ProposalRow;
  sprintName: string;
  availableAssignees: AssigneeOption[];
  onAssigneeChange: (ticketId: string, assigneeId: string | null) => void;
}

const FLAG_STYLES = {
  OK: "",
  OVER_CAPACITY: "bg-amber-50 dark:bg-amber-950/20",
  // BUG-21: Distinct red background so UNASSIGNABLE is not confused with OVER_CAPACITY.
  UNASSIGNABLE: "bg-red-50 dark:bg-red-950/20",
} as const;

export function AutoAssignRow({
  row,
  sprintName,
  availableAssignees,
  onAssigneeChange,
}: AutoAssignRowProps) {
  const eligibleAssignees = availableAssignees.filter(
    (a) => a.team === row.team
  );

  return (
    <tr
      className={cn(
        "border-b last:border-0 transition-colors",
        FLAG_STYLES[row.flag]
      )}
    >
      {/* Ticket */}
      <td className="px-3 py-2.5 max-w-[180px]">
        <span className="text-sm truncate block" title={row.ticketTitle}>
          {row.ticketTitle}
        </span>
      </td>

      {/* Team */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-xs text-muted-foreground">
          {TEAM_LABELS[row.team]}
        </span>
      </td>

      {/* Required Skillset */}
      <td className="px-3 py-2.5">
        {row.requiredSkillset ? (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-white"
            style={{ backgroundColor: row.requiredSkillset.color }}
          >
            {row.requiredSkillset.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Assignee (editable) */}
      <td className="px-3 py-2.5 min-w-[150px]">
        {row.flag === "UNASSIGNABLE" ? (
          <span className="text-xs text-red-600 font-medium">
            No match
          </span>
        ) : (
          <Select
            value={row.proposedAssigneeId ?? "__none__"}
            onValueChange={(v) =>
              onAssigneeChange(row.ticketId, v === "__none__" ? null : v)
            }
          >
            <SelectTrigger size="sm" className="w-full text-xs">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground">Unassigned</span>
              </SelectItem>
              {eligibleAssignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>

      {/* Sprint (fixed) */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-xs text-muted-foreground">{sprintName}</span>
      </td>

      {/* Size */}
      <td className="px-3 py-2.5">
        <SizeBadge size={row.size} />
      </td>

      {/* Flag / Status */}
      <td className="px-3 py-2.5">
        {row.flag === "OK" && (
          <Badge
            variant="outline"
            className="text-[11px] text-[#008146] border-[#008146]/30 bg-[#008146]/10"
          >
            OK
          </Badge>
        )}
        {row.flag === "OVER_CAPACITY" && (
          <Badge
            variant="outline"
            className="text-[11px] text-amber-700 border-amber-300 bg-amber-50"
          >
            Over capacity
          </Badge>
        )}
        {row.flag === "UNASSIGNABLE" && (
          <Badge
            variant="outline"
            className="text-[11px] text-red-700 border-red-300 bg-red-50"
          >
            Unassignable
          </Badge>
        )}
      </td>
    </tr>
  );
}
