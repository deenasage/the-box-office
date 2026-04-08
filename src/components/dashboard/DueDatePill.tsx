// SPEC: tickets.md
// SPEC: design-improvements.md
"use client";

import { cn } from "@/lib/utils";

interface DueDatePillProps {
  dueDate: string;
}

/**
 * Renders a colored date pill with human-readable urgency label:
 *   - red   = overdue  → "X days overdue" or "Overdue today"
 *   - amber = 0–3 days → "Today", "Tomorrow", "In X days"
 *   - muted = 4+ days  → "MMM D"
 */
export function DueDatePill({ dueDate }: DueDatePillProps) {
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - now.getTime()) / 86_400_000);

  const color =
    diffDays < 0
      ? "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20"
      : diffDays <= 3
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20"
      : "bg-muted text-muted-foreground ring-1 ring-inset ring-border";

  let label: string;
  if (diffDays < -1) {
    label = `${Math.abs(diffDays)}d overdue`;
  } else if (diffDays === -1) {
    label = "1d overdue";
  } else if (diffDays === 0) {
    label = "Today";
  } else if (diffDays === 1) {
    label = "Tomorrow";
  } else if (diffDays <= 6) {
    label = `In ${diffDays}d`;
  } else {
    label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const fullDate = due.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums whitespace-nowrap",
        color
      )}
      title={fullDate}
      aria-label={`Due ${fullDate}`}
    >
      {label}
    </span>
  );
}
