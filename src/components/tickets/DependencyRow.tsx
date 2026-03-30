// SPEC: tickets.md
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Team, DependencyType } from "@prisma/client";
import { STATUS_LABELS, STATUS_BADGE_STYLES as STATUS_STYLES } from "@/lib/constants";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface LinkedTicket {
  id: string;
  title: string;
  team: Team;
  status: string;
  sprint: { id: string; name: string } | null;
}

export interface Dependency {
  id: string;
  type: DependencyType;
  fromTicket: LinkedTicket;
  toTicket: LinkedTicket;
}

export const DEP_TYPE_LABELS: Record<DependencyType, string> = {
  BLOCKS: "Blocks",
  BLOCKED_BY: "Blocked By",
  RELATED: "Related",
};

// ─── DependencyRow ────────────────────────────────────────────────────────────

interface DependencyRowProps {
  dep: Dependency;
  perspective: "from" | "to";
  canRemove: boolean;
  onRemove: (id: string) => void;
}

export function DependencyRow({
  dep,
  perspective,
  canRemove,
  onRemove,
}: DependencyRowProps) {
  const linked = perspective === "from" ? dep.toTicket : dep.fromTicket;

  return (
    <div className="flex items-center gap-2 py-2 px-3 hover:bg-muted/40 transition-colors">
      <TeamBadge team={linked.team} className="shrink-0" />
      <Link
        href={`/tickets/${linked.id}`}
        className="flex-1 text-sm font-medium hover:text-primary hover:underline transition-colors truncate"
      >
        {linked.title}
      </Link>
      <Badge
        variant="outline"
        className={cn("text-xs shrink-0", STATUS_STYLES[linked.status] ?? "")}
      >
        {STATUS_LABELS[linked.status] ?? linked.status}
      </Badge>
      {linked.sprint && (
        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
          {linked.sprint.name}
        </span>
      )}
      {canRemove && (
        <button
          onClick={() => onRemove(dep.id)}
          aria-label="Remove dependency"
          className="ml-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── DependencyGroup ──────────────────────────────────────────────────────────

interface DependencyGroupProps {
  label: string;
  deps: { dep: Dependency; perspective: "from" | "to" }[];
  canRemove: boolean;
  onRemove: (id: string) => void;
}

export function DependencyGroup({
  label,
  deps,
  canRemove,
  onRemove,
}: DependencyGroupProps) {
  if (deps.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/30">
        {label}
      </p>
      <div className="divide-y">
        {deps.map(({ dep, perspective }) => (
          <DependencyRow
            key={dep.id}
            dep={dep}
            perspective={perspective}
            canRemove={canRemove}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
