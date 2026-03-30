// SPEC: tickets.md
// SPEC: design-improvements.md
"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

export type SortKey =
  | "title"
  | "status"
  | "priority"
  | "size"
  | "assignee"
  | "sprint"
  | "epic"
  | "createdAt";

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}

export function SortHeader({ label, sortKey, current, dir, onSort }: SortHeaderProps) {
  const active = current === sortKey;
  return (
    <th
      className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground whitespace-nowrap"
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}
