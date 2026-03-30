// SPEC: sprints.md
// Scrum Master requirement: Sprint Review checklist — SM-facing gate to verify
// readiness before closing the sprint. State persisted per-sprint in localStorage.
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewItem {
  id: string;
  text: string;
}

const STORAGE_KEY = "ticket-intake:sprint-review-checklist";

const REVIEW_ITEMS: ReviewItem[] = [
  { id: "done-validated",      text: "All DONE tickets validated against acceptance criteria" },
  { id: "demo-recorded",       text: "Demo recorded or notes taken" },
  { id: "stakeholders-notified", text: "Stakeholders notified of sprint outcome" },
  { id: "velocity-recorded",   text: "Velocity recorded for reporting" },
];

interface CheckedMap {
  [key: string]: boolean;
}

function load(): CheckedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CheckedMap) : {};
  } catch {
    return {};
  }
}

function save(checked: CheckedMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  } catch {}
}

export function SprintReviewChecklist({ sprintId }: { sprintId: string }) {
  const [checked, setChecked] = useState<CheckedMap>({});

  useEffect(() => {
    setChecked(load());
  }, []);

  function toggle(itemId: string) {
    const key = `${sprintId}:${itemId}`;
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    save(next);
  }

  const checkedCount = REVIEW_ITEMS.filter((i) => checked[`${sprintId}:${i.id}`]).length;
  const total = REVIEW_ITEMS.length;
  const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
  const allDone = checkedCount === total;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              allDone ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            allDone ? "text-green-500" : "text-muted-foreground"
          )}
        >
          {checkedCount}/{total}
          {allDone && " Ready to close"}
        </span>
      </div>

      {/* Checklist */}
      <ul className="space-y-1" role="list" aria-label="Sprint Review checklist">
        {REVIEW_ITEMS.map((item) => {
          const key = `${sprintId}:${item.id}`;
          const isChecked = !!checked[key];
          return (
            <li key={item.id}>
              <button
                onClick={() => toggle(item.id)}
                className="flex items-center gap-2 w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                aria-pressed={isChecked}
                aria-label={isChecked ? `Uncheck: ${item.text}` : `Check: ${item.text}`}
              >
                <span
                  className={cn(
                    "shrink-0 transition-colors",
                    isChecked ? "text-green-500" : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {isChecked
                    ? <CheckCircle2 className="h-4 w-4" />
                    : <Circle className="h-4 w-4" />}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isChecked && "line-through text-muted-foreground"
                  )}
                >
                  {item.text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
