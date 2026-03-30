// SPEC: sprint-scrum.md
// SPEC: design-improvements.md
"use client";

import { Badge } from "@/components/ui/badge";

type Health = "on-track" | "at-risk" | "off-track";

function computeHealth(
  completedHours: number,
  totalHours: number,
  daysElapsed: number,
  totalDays: number,
  blockedCount: number
): Health {
  const expectedProgress = totalDays > 0 ? daysElapsed / totalDays : 0;
  const actualProgress = totalHours > 0 ? completedHours / totalHours : 0;
  if (blockedCount >= 3 || actualProgress < expectedProgress - 0.2) return "off-track";
  if (actualProgress < expectedProgress - 0.1) return "at-risk";
  return "on-track";
}

interface SprintHealthBadgeProps {
  completedHours: number;
  totalHours: number;
  startDate: Date | string;
  endDate: Date | string;
  blockedCount: number;
}

// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
const HEALTH_STYLES: Record<Health, string> = {
  "on-track":  "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20 border-0",
  "at-risk":   "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20 border-0",
  "off-track": "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20 border-0",
};

const HEALTH_LABELS: Record<Health, string> = {
  "on-track": "On Track",
  "at-risk": "At Risk",
  "off-track": "Off Track",
};

export function SprintHealthBadge({
  completedHours,
  totalHours,
  startDate,
  endDate,
  blockedCount,
}: SprintHealthBadgeProps) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  const daysElapsed = Math.max(0, Math.min(totalDays, Math.ceil((now.getTime() - start.getTime()) / 86_400_000)));

  const health = computeHealth(completedHours, totalHours, daysElapsed, totalDays, blockedCount);

  return (
    <Badge variant="outline" className={`text-xs font-medium ${HEALTH_STYLES[health]}`}>
      {HEALTH_LABELS[health]}
    </Badge>
  );
}
