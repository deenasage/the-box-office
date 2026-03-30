// SPEC: auth.md, tickets.md, form-builder.md
import { Team, TicketStatus, TicketSize, UserRole, FieldType } from "@prisma/client";

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team: Team | null;
  createdAt: Date;
  updatedAt: Date;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      team: Team | null;
    };
  }
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    team: Team | null;
  }
}

// ── Forms ────────────────────────────────────────────────────────────────────

export interface ConditionalRule {
  action: "show" | "hide" | "require";
  when: {
    fieldKey: string;
    operator:
      | "equals"
      | "not_equals"
      | "contains"
      | "is_empty"
      | "is_not_empty";
    value?: string | string[];
  };
}

export interface FormFieldConfig {
  id: string;
  label: string;
  fieldKey: string;
  type: FieldType;
  required: boolean;
  order: number;
  options?: string[];
  conditions?: ConditionalRule[];
}

// ── Tickets ──────────────────────────────────────────────────────────────────

export interface TicketWithRelations {
  id: string;
  title: string;
  description: string | null;
  team: Team;
  status: TicketStatus;
  size: TicketSize | null;
  priority: number;
  formData: string;
  templateId: string | null;
  assigneeId: string | null;
  assignee: SafeUser | null;
  creatorId: string;
  creator: SafeUser;
  sprintId: string | null;
  sprint: { id: string; name: string } | null;
  epicId: string | null;
  epic: { id: string; name: string; color: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sprint Report ─────────────────────────────────────────────────────────────

export interface TeamReportRow {
  team: Team;
  committed: number;
  completed: number;
  ticketCount: number;
}

export interface SprintReport {
  sprintId: string;
  sprintName: string;
  totalCommitted: number;
  totalCompleted: number;
  velocity: number;
  teamBreakdown: TeamReportRow[];
}

// ── Shared Summary Types ──────────────────────────────────────────────────────
//
// These lightweight types are used in list views, boards, and filters across
// multiple components. They are intentionally narrower than the full Prisma
// model types, containing only the fields needed for display.

/** Lightweight ticket shape used in the Kanban board and the list table. */
export interface TicketSummary {
  id: string;
  title: string;
  status: TicketStatus;
  priority: number;
  size: TicketSize | null;
  team: Team;
  assignee: { id: string; name: string } | null;
  sprint: { id: string; name: string } | null;
  // List-view fields (optional — not present on board cards)
  createdAt?: Date;
  epic?: { id: string; name: string } | null;
  // Board-view fields (optional — not present in list table)
  labels?: { id: string; name: string; color: string }[];
  dueDate?: Date | string | null;
  requiredSkillset?: { name: string; color: string } | null;
}

/**
 * Lightweight epic shape used in the form dialog and edit button.
 * startDate / endDate are `string | Date | null` because they travel over
 * the wire as ISO strings and are also set as Date objects client-side.
 *
 * Note: EpicDragBar and RoadmapTimeline use `RoadmapEpic` (defined below),
 * which has a richer shape with a `tickets` array. EpicSummary covers the
 * writable/form use-case only.
 */
export interface EpicSummary {
  id: string;
  name: string;
  color: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
  team: Team | null;
}

/** Minimal sprint shape used in filter dropdowns and bulk-action selectors. */
export interface SprintSummary {
  id: string;
  name: string;
}

// ── Roadmap ──────────────────────────────────────────────────────────────────

export interface RoadmapEpic {
  id: string;
  name: string;
  team: Team | null;
  status: string | null;
  color: string;
  startDate: Date | null;
  endDate: Date | null;
  tickets: { id: string; title: string; status: TicketStatus; team: Team }[];
}

export interface RoadmapPayload {
  epics: RoadmapEpic[];
  sprints: { id: string; name: string; startDate: Date; endDate: Date }[];
}
