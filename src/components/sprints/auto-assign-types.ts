// SPEC: auto-assign-v2.md
// Shared type definitions for the auto-assign v2 UX components.

import { Team, TicketSize } from "@prisma/client";

export const ALL_TEAMS: Team[] = ["CONTENT", "DESIGN", "SEO", "WEM", "PAID_MEDIA", "ANALYTICS"];

export interface AutoAssignProposalV2 {
  ticketId: string;
  ticketTitle: string;
  team: Team;
  size: TicketSize | null;
  priority: number;
  requiredSkillsetId: string | null;
  requiredSkillsetName: string | null;
  proposedAssigneeId: string | null;
  proposedAssigneeName: string | null;
  targetSprintId: string;
  committedHoursBefore: number;
  committedHoursAfter: number;
  capacityHours: number | null;
  flag: "OK" | "OVER_CAPACITY" | "UNASSIGNABLE";
  matchReason: string;
  dependencyOrder: number;
}

export interface SkippedTicket {
  id: string;
  title: string;
  team: Team;
  size: TicketSize | null;
  reason: "NO_SIZE" | "BLOCKED" | "NO_ASSIGNEE_AVAILABLE";
  blockedByTicketId?: string;
  blockedByTicketTitle?: string;
}

export interface SkillGapWarning {
  skillsetId: string;
  skillsetName: string;
  team?: Team;
  ticketCount: number;
  holderCount: number;
  totalHoursRequired?: number;
  totalCapacityHours?: number;
  warning: "BOTTLENECK" | "NO_HOLDER";
}

export interface TeamStat {
  team: Team;
  totalTickets: number;
  assignedTickets: number;
  unassignableTickets: number;
  totalCommittedHours: number;
}

export interface AvailableAssigneeV2 {
  id: string;
  name: string;
  team: Team;
  skillsets: { id: string; name: string }[];
  committedHours: number;
  capacityHours: number | null;
}

export interface PreviewResponseV2 {
  proposals: AutoAssignProposalV2[];
  skippedTickets: SkippedTicket[];
  skillGapWarnings: SkillGapWarning[];
  teamStats: TeamStat[];
  targetSprint: { id: string; name: string };
  availableAssignees: AvailableAssigneeV2[];
}

export interface AutoAssignConfig {
  teams: Team[];
  ignoreCapacity: boolean;
  includeStatuses: string[];
  prioritizeCarryover?: boolean;
}

// Mutable draft row used inside SprintPlanningModal state.
// Extends the proposal with a local "removed" flag and a mutable assignee.
export interface ProposalRowV2 extends AutoAssignProposalV2 {
  removed: boolean;
  // These can be overridden locally by the user:
  localAssigneeId: string | null;
  localAssigneeName: string | null;
}

export type PlanningFilter =
  | "ALL"
  | "OK"
  | "OVER_CAPACITY"
  | "UNASSIGNABLE"
  | "REMOVED";
