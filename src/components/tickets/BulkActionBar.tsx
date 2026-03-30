// SPEC: tickets.md
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TicketStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/constants";
import type { SprintSummary } from "@/types";

interface User {
  id: string;
  name: string;
}

interface BulkActionBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  onSuccess: () => void;
}

const ALL_STATUSES = Object.values(TicketStatus) as TicketStatus[];

async function postBulk(
  ids: string[],
  patch: { status?: TicketStatus; assigneeId?: string | null; sprintId?: string | null }
): Promise<number> {
  const res = await fetch("/api/tickets/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, patch }),
  });
  if (!res.ok) throw new Error("Bulk update failed");
  const json = (await res.json()) as { updated: number };
  return json.updated;
}

export function BulkActionBar({ selectedIds, onClear, onSuccess }: BulkActionBarProps) {
  const count = selectedIds.size;
  const [isPending, startTransition] = useTransition();

  // Lazy-loaded option lists — fetched only on first dropdown open
  const [users, setUsers] = useState<User[] | null>(null);
  const [sprints, setSprints] = useState<SprintSummary[] | null>(null);

  async function loadUsers() {
    if (users !== null) return;
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return;
      const data = (await res.json()) as User[];
      setUsers(data);
    } catch {
      // silently ignore — the dropdown will be empty
    }
  }

  async function loadSprints() {
    if (sprints !== null) return;
    try {
      const res = await fetch("/api/sprints?limit=200");
      if (!res.ok) return;
      const json = (await res.json()) as { data: SprintSummary[] };
      setSprints(json.data);
    } catch {
      // silently ignore
    }
  }

  function applyPatch(patch: Parameters<typeof postBulk>[1]) {
    startTransition(async () => {
      try {
        const n = await postBulk(Array.from(selectedIds), patch);
        toast.success(`Updated ${n} ticket${n !== 1 ? "s" : ""}`);
        onClear();
        onSuccess();
      } catch {
        toast.error("Bulk update failed. Please try again.");
      }
    });
  }

  if (count === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg border bg-muted/60 text-sm"
    >
      <span className="font-medium text-foreground mr-1">
        {count} selected
      </span>

      {/* Change Status */}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={isPending} aria-label="Change status of selected tickets" />}>
          Change Status
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {ALL_STATUSES.map((s) => (
            <DropdownMenuItem key={s} onSelect={() => applyPatch({ status: s })}>
              {STATUS_LABELS[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Assign To */}
      <DropdownMenu onOpenChange={(open) => { if (open) loadUsers(); }}>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={isPending} aria-label="Assign selected tickets" />}>
          Assign To
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => applyPatch({ assigneeId: null })}>
            Unassigned
          </DropdownMenuItem>
          {users === null ? (
            <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
          ) : users.length === 0 ? (
            <DropdownMenuItem disabled>No users found</DropdownMenuItem>
          ) : (
            users.map((u) => (
              <DropdownMenuItem key={u.id} onSelect={() => applyPatch({ assigneeId: u.id })}>
                {u.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Move to Sprint */}
      <DropdownMenu onOpenChange={(open) => { if (open) loadSprints(); }}>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={isPending} aria-label="Move selected tickets to sprint" />}>
          Move to Sprint
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => applyPatch({ sprintId: null })}>
            Backlog (no sprint)
          </DropdownMenuItem>
          {sprints === null ? (
            <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
          ) : sprints.length === 0 ? (
            <DropdownMenuItem disabled>No sprints found</DropdownMenuItem>
          ) : (
            sprints.map((sp) => (
              <DropdownMenuItem key={sp.id} onSelect={() => applyPatch({ sprintId: sp.id })}>
                {sp.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear selection */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={isPending}
        aria-label="Clear selection"
        className="ml-auto gap-1"
      >
        <X className="h-3.5 w-3.5" />
        Clear
      </Button>
    </div>
  );
}
