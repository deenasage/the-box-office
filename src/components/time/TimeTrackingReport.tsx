// SPEC: sprint-scrum.md
"use client";

import { useState, useMemo } from "react";
import { Team } from "@prisma/client";
import { TEAM_LABELS, TEAM_BADGE_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TimeLogRow {
  id: string;
  hours: number;
  note: string | null;
  loggedAt: string;
  user: { id: string; name: string };
  ticket: {
    id: string;
    title: string;
    team: Team;
    sprintId: string | null;
    sprint: { name: string } | null;
  };
}

export interface UserOption {
  id: string;
  name: string;
}

export interface SprintOption {
  id: string;
  name: string;
}

interface Props {
  logs: TimeLogRow[];
  users: UserOption[];
  sprints: SprintOption[];
  initialUserId?: string;
  initialSprintId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(hours: number): string {
  return `${hours % 1 === 0 ? hours : hours.toFixed(2)}h`;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function TimeTrackingReport({
  logs,
  users,
  sprints,
  initialUserId = "",
  initialSprintId = "",
}: Props) {
  const [userId, setUserId] = useState<string>(initialUserId ?? "");
  const [sprintId, setSprintId] = useState<string>(initialSprintId ?? "");

  // Client-side filtering
  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (userId && log.user.id !== userId) return false;
      if (sprintId && log.ticket.sprintId !== sprintId) return false;
      return true;
    });
  }, [logs, userId, sprintId]);

  // Summary stats
  const totalHours = filtered.reduce((s, l) => s + l.hours, 0);
  const uniqueContributors = new Set(filtered.map((l) => l.user.id)).size;
  const uniqueTickets = new Set(filtered.map((l) => l.ticket.id)).size;

  // Per-user subtotals
  const userTotals = useMemo(() => {
    const map = new Map<string, { name: string; hours: number }>();
    for (const log of filtered) {
      const existing = map.get(log.user.id);
      if (existing) {
        existing.hours += log.hours;
      } else {
        map.set(log.user.id, { name: log.user.name, hours: log.hours });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="user-filter" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            User
          </label>
          <select
            id="user-filter"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sprint-filter" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Sprint
          </label>
          <select
            id="sprint-filter"
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {(userId || sprintId) && (
          <button
            onClick={() => { setUserId(""); setSprintId(""); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card px-4 py-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Total Hours</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(totalHours)}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Contributors</p>
          <p className="text-2xl font-bold tabular-nums">{uniqueContributors}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Tickets Worked On</p>
          <p className="text-2xl font-bold tabular-nums">{uniqueTickets}</p>
        </div>
      </div>

      {/* Log table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <p className="font-medium text-foreground">No time logs match the current filters.</p>
          <p className="text-sm mt-1">Try adjusting the user or sprint filter.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">User</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Ticket</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Team</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Hours</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.loggedAt)}
                  </td>
                  <td className="px-3 py-2 font-medium">{log.user.name}</td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <span className="truncate block" title={log.ticket.title}>
                      {log.ticket.title}
                    </span>
                    {log.ticket.sprint && (
                      <span className="text-[11px] text-muted-foreground">{log.ticket.sprint.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TEAM_BADGE_COLORS[log.ticket.team]}`}
                    >
                      {TEAM_LABELS[log.ticket.team]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt(log.hours)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px]">
                    <span className="truncate block" title={log.note ?? undefined}>
                      {log.note ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-user subtotals */}
      {userTotals.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold">Hours by User</h3>
          <div className="space-y-1.5">
            {userTotals.map((u) => {
              const pct = totalHours > 0 ? Math.round((u.hours / totalHours) * 100) : 0;
              return (
                <div key={u.name} className="flex items-center gap-3">
                  <span className="text-sm w-32 truncate shrink-0">{u.name}</span>
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold tabular-nums w-12 text-right">{fmt(u.hours)}</span>
                  <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="pt-1 border-t flex justify-between text-sm">
            <span className="font-semibold">Total</span>
            <span className="font-bold tabular-nums">{fmt(totalHours)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
