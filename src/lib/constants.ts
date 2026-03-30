// SPEC: design-improvements.md
import { Team } from "@prisma/client";

/** Human-readable labels for each team */
export const TEAM_LABELS: Record<Team, string> = {
  CONTENT: "Content",
  DESIGN: "Design",
  SEO: "SEO",
  WEM: "WEM",
  PAID_MEDIA: "Paid Media",
  ANALYTICS: "Analytics",
};

/** Human-readable labels for ticket priority levels (index = priority value) */
export const PRIORITY_LABELS: readonly string[] = ["—", "Low", "Medium", "High"];

/** Human-readable labels for ticket statuses */
export const STATUS_LABELS: Record<string, string> = {
  BACKLOG:     "Backlog",
  TODO:        "Prioritized",
  READY:       "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW:   "In Review",
  BLOCKED:     "Blocked",
  DONE:        "Done",
};

// Tailwind badge classes per ticket status.
// Uses the modern translucent pill pattern:
// bg-COLOR/10 text-COLOR-700 dark:text-COLOR-300 ring-1 ring-inset ring-COLOR/20
export const STATUS_BADGE_STYLES: Record<string, string> = {
  // TicketStatus values
  BACKLOG:     "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  TODO:        "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20",
  READY:       "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 ring-1 ring-inset ring-yellow-500/20",
  IN_REVIEW:   "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20",
  BLOCKED:     "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20",
  DONE:        "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20",
  // BriefStatus values — used by BriefHeader and briefs list page
  DRAFT:       "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  GENERATING:  "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20",
  REVIEW:      "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20",
  FINALIZED:   "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20",
  APPROVED:    "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20",
  ARCHIVED:    "bg-slate-500/10 text-slate-500 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
};

/** Tailwind dot classes per ticket priority (string-keyed, used in AI proposal cards) */
export const PRIORITY_DOT_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-blue-500",
};

/**
 * Tailwind dot classes per ticket priority numeric level (0 = none, 1 = Low, 2 = Medium, 3 = High).
 * Use this when priority is a number (Ticket.priority field).
 */
export const PRIORITY_DOT_COLORS_NUMERIC: Record<number, string> = {
  1: "bg-yellow-400",
  2: "bg-orange-400",
  3: "bg-red-500",
};

/** Tailwind badge/border classes per team (used in capacity UI) */
export const TEAM_BADGE_COLORS: Record<Team, string> = {
  CONTENT:    "text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 bg-sky-500/10",
  DESIGN:     "text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 bg-violet-500/10",
  SEO:        "text-[#008146] dark:text-[#00D93A] border-[#008146]/30 dark:border-[#00D93A]/30 bg-[#008146]/10",
  WEM:        "text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-500/10",
  PAID_MEDIA: "text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-500/10",
  ANALYTICS:  "text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 bg-cyan-500/10",
};

/** Hex color strings per team (used in Recharts charts) */
export const TEAM_CHART_COLORS: Record<Team, string> = {
  CONTENT: "#0ea5e9",
  DESIGN: "#7c3aed",
  SEO: "#008146",
  WEM: "#f59e0b",
  PAID_MEDIA: "#9333ea",
  ANALYTICS: "#0891b2",
};
