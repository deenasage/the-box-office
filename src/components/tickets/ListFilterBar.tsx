// SPEC: tickets.md
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Team, Hub } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { HUB_LABELS } from "@/components/kanban/types";

const TEAM_LABELS: Record<Team, string> = {
  CONTENT:    "Content",
  DESIGN:     "Design",
  SEO:        "SEO",
  WEM:        "WEM",
  PAID_MEDIA: "Paid Media",
  ANALYTICS:  "Analytics",
};

interface ListFilterBarProps {
  sprints: { id: string; name: string }[];
  users: { id: string; name: string }[];
}

export function ListFilterBar({ sprints, users }: ListFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const team       = searchParams.get("team") ?? "";
  const sprintId   = searchParams.get("sprintId") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";
  const hub        = searchParams.get("hub") ?? "";
  const carryover  = searchParams.get("carryover") === "1";
  const aiPending  = searchParams.get("aiPending") === "1";
  const unsized    = searchParams.get("unsized") === "1";

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page"); // reset pagination on filter change
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`/tickets/list?${params.toString()}`);
    },
    [router, searchParams]
  );

  const toggle = useCallback(
    (key: string, current: boolean) => {
      update(key, current ? null : "1");
    },
    [update]
  );

  const reset = useCallback(() => {
    router.push("/tickets/list");
  }, [router]);

  const hasFilters =
    team || sprintId || assigneeId || hub || carryover || aiPending || unsized;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Team */}
      <Select value={team || "_all"} onValueChange={(v) => update("team", v === "_all" ? null : v)}>
        <SelectTrigger className="h-8 w-36 text-sm" aria-label="Filter by team">
          <span data-slot="select-value" className="flex flex-1 text-left truncate">
            {team ? (TEAM_LABELS[team as Team] ?? team) : "All Teams"}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Teams</SelectItem>
          {(Object.values(Team) as Team[]).map((t) => (
            <SelectItem key={t} value={t}>{TEAM_LABELS[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sprint */}
      <Select value={sprintId || "_all"} onValueChange={(v) => update("sprintId", v === "_all" ? null : v)}>
        <SelectTrigger className="h-8 w-40 text-sm" aria-label="Filter by sprint">
          <span data-slot="select-value" className="flex flex-1 text-left truncate">
            {sprintId ? (sprints.find((s) => s.id === sprintId)?.name ?? sprintId) : "All Sprints"}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Sprints</SelectItem>
          {sprints.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assignee */}
      <Select value={assigneeId || "_all"} onValueChange={(v) => update("assigneeId", v === "_all" ? null : v)}>
        <SelectTrigger className="h-8 w-40 text-sm" aria-label="Filter by assignee">
          <span data-slot="select-value" className="flex flex-1 text-left truncate">
            {assigneeId ? (users.find((u) => u.id === assigneeId)?.name ?? assigneeId) : "All Assignees"}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Assignees</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Hub */}
      <Select value={hub || "_all"} onValueChange={(v) => update("hub", v === "_all" ? null : v)}>
        <SelectTrigger className="h-8 w-36 text-sm" aria-label="Filter by hub">
          <span data-slot="select-value" className="flex flex-1 text-left truncate">
            {hub ? (HUB_LABELS[hub as Hub] ?? hub) : "All Hubs"}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Hubs</SelectItem>
          {(Object.values(Hub) as Hub[]).map((h) => (
            <SelectItem key={h} value={h}>{HUB_LABELS[h]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Toggle: Carryover only */}
      <button
        onClick={() => toggle("carryover", carryover)}
        aria-pressed={carryover}
        className={cn(
          "text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          carryover
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
            : "border-border text-muted-foreground hover:text-foreground"
        )}
      >
        Carryover only
      </button>

      {/* Toggle: Unsized */}
      <button
        onClick={() => toggle("unsized", unsized)}
        aria-pressed={unsized}
        className={cn(
          "text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          unsized
            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
            : "border-border text-muted-foreground hover:text-foreground"
        )}
      >
        Unsized
      </button>

      {/* Reset — always last */}
      {hasFilters && (
        <button
          onClick={reset}
          className="text-xs text-muted-foreground hover:text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-0.5"
        >
          Reset
        </button>
      )}
    </div>
  );
}
