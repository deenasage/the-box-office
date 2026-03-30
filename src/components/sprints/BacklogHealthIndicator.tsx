// SPEC: sprints.md
// SPEC: design-improvements.md
// Scrum Master requirement: Backlog health indicator — shows count of unestimated
// (no size) tickets, tickets without assignees, and tickets in BLOCKED status in the
// backlog to prompt the team to run refinement.
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { TicketSize, TicketStatus } from "@prisma/client";

interface BacklogTicket {
  id: string;
  size: TicketSize | null;
  assigneeId: string | null;
  status: TicketStatus;
}

interface TicketsResponse {
  data: BacklogTicket[];
  total: number;
}

interface HealthCounts {
  unestimated: number;
  unassigned: number;
  blocked: number;
}

export function BacklogHealthIndicator() {
  const [counts, setCounts] = useState<HealthCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tickets?status=BACKLOG&limit=200")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<TicketsResponse>;
      })
      .then((json) => {
        setCounts({
          unestimated: json.data.filter((t) => t.size === null).length,
          unassigned: json.data.filter((t) => t.assigneeId === null).length,
          blocked: json.data.filter((t) => t.status === TicketStatus.BLOCKED).length,
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking backlog…
      </span>
    );
  }

  if (counts === null) return null;

  const totalIssues = counts.unestimated + counts.unassigned + counts.blocked;

  if (totalIssues === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Backlog healthy — all tickets estimated, assigned, and unblocked
      </span>
    );
  }

  const parts: string[] = [];
  if (counts.unestimated > 0) parts.push(`${counts.unestimated} unestimated`);
  if (counts.unassigned > 0) parts.push(`${counts.unassigned} unassigned`);
  if (counts.blocked > 0) parts.push(`${counts.blocked} blocked`);

  return (
    <Link
      href="/tickets?status=BACKLOG"
      className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20 px-2.5 py-1 text-xs font-medium hover:bg-amber-500/15 transition-colors"
      title="Go to backlog — refinement needed"
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      Backlog needs refinement: {parts.join(", ")}
    </Link>
  );
}
