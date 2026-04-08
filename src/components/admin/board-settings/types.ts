// SPEC: board-column-visibility.md
export type TeamKey = "CONTENT" | "DESIGN" | "SEO" | "WEM";

export const TEAMS: { key: TeamKey; label: string; color: string }[] = [
  { key: "CONTENT", label: "Content",  color: "bg-blue-500" },
  { key: "DESIGN",  label: "Design",   color: "bg-purple-500" },
  { key: "SEO",     label: "SEO",      color: "bg-green-500" },
  { key: "WEM",     label: "WEM",      color: "bg-orange-500" },
];

export const STATUS_LIST = [
  { key: "BACKLOG",     label: "Backlog",     color: "bg-slate-400" },
  { key: "PRIORITIZED", label: "Prioritized", color: "bg-blue-400" },
  { key: "TODO",        label: "To Do",       color: "bg-cyan-400" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-amber-400" },
  { key: "IN_REVIEW",   label: "In Review",   color: "bg-violet-400" },
  { key: "BLOCKED",     label: "Blocked",     color: "bg-red-400" },
  { key: "DONE",        label: "Done",        color: "bg-emerald-500" },
] as const;

export type StatusKey = typeof STATUS_LIST[number]["key"];

export interface StatusSetting {
  team: TeamKey;
  status: StatusKey;
  visible: boolean;
  wipLimit: number | null;
}

export type BoardSettings = StatusSetting[];
