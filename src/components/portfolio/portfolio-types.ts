// SPEC: portfolio-view.md
// Shared TypeScript types for portfolio components

export interface TicketCounts {
  total: number;
  done: number;
  inProgress: number;
  backlog: number;
}

export interface PortfolioListItem {
  epicId: string;
  epicName: string;
  epicTeam: string | null;
  epicStatus: string;
  epicStartDate: string | null;
  epicEndDate: string | null;
  activeBriefStatus: string | null;
  ticketCounts: TicketCounts;
  completionPct: number;
  sprints: string[];
  teams: string[];
}

export interface PortfolioListResponse {
  data: PortfolioListItem[];
  total: number;
  inProgressTotal: number;
  completedTotal: number;
  page: number;
  limit: number;
}

export interface PortfolioDetailTicket {
  id: string;
  title: string;
  status: string;
  size: string | null;
  sprintId: string | null;
  sprintName: string | null;
  assigneeName: string | null;
  briefId: string | null;
}

export interface PortfolioDetailTeamGroup {
  team: string;
  tickets: PortfolioDetailTicket[];
  committedPoints: number;
  completedPoints: number;
}

export interface PortfolioDetailBrief {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  creatorName: string;
}

export interface PortfolioDetail {
  epic: {
    id: string;
    name: string;
    description: string | null;
    team: string | null;
    status: string;
    color: string;
    startDate: string | null;
    endDate: string | null;
  };
  briefs: PortfolioDetailBrief[];
  ticketsByTeam: PortfolioDetailTeamGroup[];
  timeline: {
    earliestSprintStart: string | null;
    latestSprintEnd: string | null;
  };
}

export interface PortfolioSummaryData {
  byStatus: { status: string; count: number }[];
  teamLoad: { team: string; capacity: number; committed: number }[];
  upcomingDelivery: { epicId: string; epicName: string; endDate: string; completionPct: number }[];
  atRisk: { epicId: string; epicName: string; warningCount: number }[];
}

export const EPIC_STATUS_STYLES: Record<string, string> = {
  INTAKE:      "bg-muted text-muted-foreground border-border",
  IN_BRIEF:    "bg-sky-50 text-sky-700 border-sky-200",
  BRIEFED:     "bg-indigo-50 text-indigo-700 border-indigo-200",
  IN_PLANNING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/20",
  DONE:        "bg-[#008146]/10 text-[#008146] border-[#008146]/30",
  ON_HOLD:     "bg-slate-50 text-slate-600 border-slate-200",
  CANCELLED:   "bg-red-50/50 text-red-400 border-red-200",
};

export const EPIC_STATUS_LABELS: Record<string, string> = {
  INTAKE:      "Intake",
  IN_BRIEF:    "In Brief",
  BRIEFED:     "Briefed",
  IN_PLANNING: "In Planning",
  IN_PROGRESS: "In Progress",
  DONE:        "Done",
  ON_HOLD:     "On Hold",
  CANCELLED:   "Cancelled",
};
