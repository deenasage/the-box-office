// SPEC: tickets.md
// SPEC: design-improvements.md
// SPEC: handoffs
import { TicketStatus, Team, TicketSize, Hub, TicketType } from "@prisma/client";

export { TicketType };

export { Hub };

export interface KanbanTicket {
  id: string;
  title: string;
  status: TicketStatus;
  type: TicketType | null;
  team: Team | null;
  hub: Hub | null;
  tier: string | null;
  category: string | null;
  priority: number;
  size: TicketSize | null;
  createdAt: string;
  updatedAt: string;
  cycleStartedAt: string | null;
  isCarryover: boolean;
  hasPendingEstimate: boolean;
  assignee: { id: string; name: string } | null;
  epic: { id: string; name: string; color: string | null } | null;
  crossTeamBlocking?: { team: Team }[];
  crossTeamBlockedBy?: { team: Team; status: string }[];
}

export const HUB_LABELS: Record<Hub, string> = {
  NA_HUB:   "NA Hub",
  EU_HUB:   "EU Hub",
  UKIA_HUB: "UKIA Hub",
};

export const HUB_SHORT: Record<Hub, string> = {
  NA_HUB:   "NA",
  EU_HUB:   "EU",
  UKIA_HUB: "UKIA",
};

export type GroupBy = "none" | "team" | "epic" | "assignee" | "priority";

export const PRIORITY_GROUP_LABELS: Record<number, string> = {
  0: "No Priority",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

export const COLUMNS: {
  status: TicketStatus;
  label: string;
  color: string;
  headerBg: string;
  labelColor: string;
  dotColor: string;
  wipLimit: number | null;
}[] = [
  { status: "BACKLOG",     label: "Backlog",     color: "border-slate-500",  headerBg: "bg-slate-500/5",  labelColor: "text-slate-600 dark:text-slate-400",   dotColor: "bg-slate-400",   wipLimit: null },
  { status: "TODO",        label: "Prioritized", color: "border-blue-500",   headerBg: "bg-blue-500/5",   labelColor: "text-blue-700 dark:text-blue-300",     dotColor: "bg-blue-400",    wipLimit: null },
  { status: "READY",       label: "To Do",       color: "border-sky-500",    headerBg: "bg-sky-500/5",    labelColor: "text-sky-700 dark:text-sky-300",       dotColor: "bg-sky-400",     wipLimit: null },
  { status: "IN_PROGRESS", label: "In Progress", color: "border-violet-500", headerBg: "bg-violet-500/5", labelColor: "text-violet-700 dark:text-violet-300", dotColor: "bg-violet-400",  wipLimit: 5 },
  { status: "IN_REVIEW",   label: "In Review",   color: "border-purple-500", headerBg: "bg-purple-500/5", labelColor: "text-purple-700 dark:text-purple-300", dotColor: "bg-purple-400",  wipLimit: 3 },
  { status: "BLOCKED",     label: "Blocked",     color: "border-red-500",    headerBg: "bg-red-500/5",    labelColor: "text-red-700 dark:text-red-300",       dotColor: "bg-red-500",     wipLimit: null },
  { status: "DONE",        label: "Done",        color: "border-green-500",  headerBg: "bg-green-500/5",  labelColor: "text-green-700 dark:text-green-300",   dotColor: "bg-green-500",   wipLimit: null },
];

// Modern translucent pill: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
export const TEAM_COLORS: Record<Team, string> = {
  CONTENT:    "bg-sky-500/20 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/30",
  DESIGN:     "bg-violet-500/20 text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/30",
  SEO:        "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  WEM:        "bg-orange-500/20 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/30",
  PAID_MEDIA: "bg-purple-500/20 text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-500/30",
  ANALYTICS:  "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-500/30",
};

export const SIZE_LABELS: Record<TicketSize, string> = { XS: "XS", S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL" };
export const AGING_THRESHOLD_DAYS = 7;

export function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}
