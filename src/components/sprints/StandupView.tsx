// SPEC: sprints.md
// Scrum Master requirement: Daily Standup view — per-assignee rows grouping
// tickets into "Completed since yesterday", "Working on today", and "Blockers".
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { STATUS_LABELS, STATUS_BADGE_STYLES } from "@/lib/constants";
import { TicketStatus } from "@prisma/client";
import Link from "next/link";

interface StandupTicket {
  id: string;
  title: string;
  status: TicketStatus;
  updatedAt: string;
  assignee: { id: string; name: string } | null;
}

interface AssigneeGroup {
  assigneeName: string;
  completed: StandupTicket[];
  inProgress: StandupTicket[];
  blocked: StandupTicket[];
}

interface TicketsResponse { data: StandupTicket[] }

const DAY_MS = 24 * 60 * 60 * 1000;

function groupByAssignee(tickets: StandupTicket[]): AssigneeGroup[] {
  const map = new Map<string, AssigneeGroup>();
  for (const t of tickets) {
    const key = t.assignee?.name ?? "Unassigned";
    if (!map.has(key)) map.set(key, { assigneeName: key, completed: [], inProgress: [], blocked: [] });
    const g = map.get(key)!;
    if (t.status === TicketStatus.DONE && Date.now() - new Date(t.updatedAt).getTime() <= DAY_MS) {
      g.completed.push(t);
    } else if (t.status === TicketStatus.IN_PROGRESS) {
      g.inProgress.push(t);
    } else if (t.status === TicketStatus.BLOCKED) {
      g.blocked.push(t);
    }
  }
  return Array.from(map.values()).filter(
    (g) => g.completed.length > 0 || g.inProgress.length > 0 || g.blocked.length > 0
  );
}

function TicketRow({ t }: { t: StandupTicket }) {
  return (
    <li>
      <Link href={`/tickets/${t.id}`} className="text-sm hover:underline text-foreground/90 truncate block">
        {t.title}
        <Badge className={`ml-2 text-[10px] px-1.5 py-0 ${STATUS_BADGE_STYLES[t.status] ?? ""}`} variant="outline">
          {STATUS_LABELS[t.status] ?? t.status}
        </Badge>
      </Link>
    </li>
  );
}

const TODAY_LABEL = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function StandupView({ sprintId }: { sprintId: string }) {
  const [groups, setGroups] = useState<AssigneeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/tickets?sprintId=${sprintId}&limit=200`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<TicketsResponse>; })
      .then((json) => { setGroups(groupByAssignee(json.data)); setLoading(false); })
      .catch(() => { setLoading(false); setError(true); });
  }, [sprintId]);

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading standup data…
    </div>
  );
  if (error) return <p className="text-sm text-destructive py-4">Failed to load standup data. Please refresh.</p>;

  const blockedCount = groups.reduce((sum, g) => sum + g.blocked.length, 0);

  return (
    <div className="space-y-4">
      {/* Standup date header — Scrum Guide: standup is a daily ceremony tied to the current day */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Standup for {TODAY_LABEL}
        </p>
        {blockedCount > 0 && (
          <span className="bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
            {blockedCount} blocked
          </span>
        )}
      </div>
      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No active, blocked, or recently completed tickets in this sprint.
        </p>
      )}
      {groups.map((group) => (
        <Card key={group.assigneeName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{group.assigneeName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.completed.length > 0 && (
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed since yesterday
                </p>
                <ul className="space-y-1 pl-1">{group.completed.map((t) => <TicketRow key={t.id} t={t} />)}</ul>
              </div>
            )}
            {group.inProgress.length > 0 && (
              <div>
                <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide mb-1">Working on today</p>
                <ul className="space-y-1 pl-1">{group.inProgress.map((t) => <TicketRow key={t.id} t={t} />)}</ul>
              </div>
            )}
            {group.blocked.length > 0 && (
              <div>
                <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Blockers
                </p>
                <ul className="space-y-1 pl-1">{group.blocked.map((t) => <TicketRow key={t.id} t={t} />)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
