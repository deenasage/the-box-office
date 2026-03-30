// SPEC: tickets.md
// SPEC: design-improvements.md
"use client";

import { cn } from "@/lib/utils";

interface DueDatePillProps {
  dueDate: string;
}

/**
 * Renders a colored date pill:
 *   - red   = overdue (dueDate < today)
 *   - amber = due within 3 days
 *   - green = more time remaining
 */
export function DueDatePill({ dueDate }: DueDatePillProps) {
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - now.getTime()) / 86_400_000);

  // Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
  const color =
    diffDays < 0
      ? "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20"
      : diffDays <= 3
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20"
      : "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20";

  const label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        color
      )}
      aria-label={`Due ${label}`}
    >
      {label}
    </span>
  );
}
