// SPEC: tickets.md
"use client";

import { Bug, Sparkles, CheckSquare, BookOpen, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TicketType } from "@prisma/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TypeConfig {
  label: string;
  icon: React.ElementType;
  classes: string;
}

export const TICKET_TYPE_CONFIG: Record<TicketType, TypeConfig> = {
  BUG:         { label: "Bug",         icon: Bug,         classes: "text-red-600 dark:text-red-400" },
  FEATURE:     { label: "Feature",     icon: Sparkles,    classes: "text-violet-600 dark:text-violet-400" },
  TASK:        { label: "Task",        icon: CheckSquare, classes: "text-blue-600 dark:text-blue-400" },
  STORY:       { label: "Story",       icon: BookOpen,    classes: "text-emerald-600 dark:text-emerald-400" },
  IMPROVEMENT: { label: "Improvement", icon: TrendingUp,  classes: "text-amber-600 dark:text-amber-400" },
};

interface TicketTypeBadgeProps {
  type: TicketType | null | undefined;
  /** compact = icon only with tooltip; full = icon + label text */
  variant?: "compact" | "full";
  className?: string;
}

export function TicketTypeBadge({
  type,
  variant = "compact",
  className,
}: TicketTypeBadgeProps) {
  if (!type) {
    // Untyped: render nothing (callers may render a faint dash instead)
    return null;
  }

  const config = TICKET_TYPE_CONFIG[type];
  const Icon = config.icon;

  if (variant === "full") {
    return (
      <span
        className={cn("inline-flex items-center gap-1 text-xs font-medium", config.classes, className)}
        aria-label={`Type: ${config.label}`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {config.label}
      </span>
    );
  }

  // Compact: icon only with tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span
            className={cn(
              "inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity",
              config.classes,
              className
            )}
            aria-label={`Type: ${config.label}`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{config.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
