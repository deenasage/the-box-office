// SPEC: tickets.md
// SPEC: design-improvements.md (typography/a11y pass)
// SPEC: skillsets.md
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeamBadge } from "./TeamBadge";
import { SizeBadge } from "./SizeBadge";
import { LabelBadge } from "./LabelBadge";
import { SkillsetBadge } from "@/components/skillsets/SkillsetBadge";
import { getInitials } from "@/lib/utils";
import { Team, TicketSize, TicketStatus } from "@prisma/client";
import { Calendar } from "lucide-react";
import { PRIORITY_LABELS } from "@/lib/constants";

const PRIORITY_DOT: Record<number, string> = {
  1: "bg-yellow-400",
  2: "bg-orange-400",
  3: "bg-red-500",
};

const TEAM_BORDER: Record<Team, string> = {
  CONTENT: "border-l-sky-400",
  DESIGN: "border-l-violet-400",
  SEO: "border-l-[#008146]",
  WEM: "border-l-amber-400",
  PAID_MEDIA: "border-l-purple-400",
  ANALYTICS: "border-l-cyan-400",
};

interface TicketLabel {
  id: string;
  name: string;
  color: string;
}

interface TicketCardProps {
  id: string;
  title: string;
  team: Team;
  size: TicketSize | null;
  priority: number;
  status: TicketStatus;
  assignee?: { name: string } | null;
  labels?: TicketLabel[];
  dueDate?: Date | string | null;
  requiredSkillset?: { name: string; color: string } | null;
}

export function TicketCard({
  id,
  title,
  team,
  size,
  priority,
  status,
  assignee,
  labels = [],
  dueDate,
  requiredSkillset,
}: TicketCardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = dueDate ? new Date(dueDate) : null;
  if (due) due.setHours(0, 0, 0, 0);
  const isOverdue = due !== null && due < today && status !== TicketStatus.DONE;

  const visibleLabels = labels.slice(0, 2);
  const extraCount = labels.length - visibleLabels.length;

  return (
    <Link href={`/tickets/${id}`}>
      <div className={`bg-card border border-l-[3px] ${TEAM_BORDER[team]} rounded-lg p-3 space-y-2 hover:shadow-md hover:ring-1 hover:ring-primary/20 transition-all cursor-pointer`}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
            {title}
          </p>
          {priority > 0 && (
            <span className="flex items-center gap-1 shrink-0 mt-0.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${PRIORITY_DOT[priority]}`}
                title={`Priority: ${PRIORITY_LABELS[priority]}`}
                aria-label={`Priority: ${PRIORITY_LABELS[priority]}`}
                role="img"
              />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <TeamBadge team={team} />
          <SizeBadge size={size} />
          {requiredSkillset && (
            <SkillsetBadge
              name={requiredSkillset.name}
              color={requiredSkillset.color}
              size="sm"
            />
          )}
        </div>
        {assignee && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[11px] bg-muted">
                {getInitials(assignee.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{assignee.name}</span>
          </div>
        )}
        {visibleLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {visibleLabels.map((label) => (
              <LabelBadge key={label.id} label={label} />
            ))}
            {extraCount > 0 && (
              <span className="text-xs text-muted-foreground">+{extraCount} more</span>
            )}
          </div>
        )}
        {due && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
            <Calendar className="h-3 w-3 shrink-0" />
            <span>
              {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            {isOverdue && <span className="font-medium">· Overdue</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
