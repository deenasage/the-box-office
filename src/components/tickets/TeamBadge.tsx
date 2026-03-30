// SPEC: tickets.md
// SPEC: design-improvements.md
import { Badge } from "@/components/ui/badge";
import { Team } from "@prisma/client";
import { cn } from "@/lib/utils";
import { TEAM_LABELS } from "@/lib/constants";

// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
const TEAM_STYLES: Record<Team, string> = {
  CONTENT:    "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20 border-0",
  DESIGN:     "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20 border-0",
  SEO:        "bg-[#008146]/10 text-[#008146] dark:text-[#00D93A] ring-1 ring-inset ring-[#008146]/20 dark:ring-[#00D93A]/20 border-0",
  WEM:        "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20 border-0",
  PAID_MEDIA: "bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-500/20 border-0",
  ANALYTICS:  "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-500/20 border-0",
};

interface TeamBadgeProps {
  team: Team;
  className?: string;
}

export function TeamBadge({ team, className }: TeamBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(TEAM_STYLES[team], "font-medium", className)}
    >
      {TEAM_LABELS[team]}
    </Badge>
  );
}
