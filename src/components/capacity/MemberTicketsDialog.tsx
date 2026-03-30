// SPEC: capacity-planning.md
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TicketStatus, TicketSize, Team } from "@prisma/client";
import { STATUS_LABELS, STATUS_BADGE_STYLES, TEAM_BADGE_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

const SIZE_LABELS: Record<TicketSize, string> = {
  XS: "XS", S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL",
};

interface MemberTicket {
  id: string;
  title: string;
  status: TicketStatus;
  size: TicketSize | null;
  dueDate: string | null;
}

interface MemberTicketsDialogProps {
  open: boolean;
  onClose: () => void;
  memberName: string;
  memberId: string;
  team: Team;
  sprintId: string;
}

export function MemberTicketsDialog({
  open,
  onClose,
  memberName,
  memberId,
  team,
  sprintId,
}: MemberTicketsDialogProps) {
  const [tickets, setTickets] = useState<MemberTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/tickets?assigneeId=${memberId}&sprintId=${sprintId}&limit=100`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load tickets");
        return r.json() as Promise<{ data: MemberTicket[] }>;
      })
      .then((res) => setTickets(res.data ?? []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [open, memberId, sprintId]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {memberName}
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded border ${TEAM_BADGE_COLORS[team]}`}
            >
              {team}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-2 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive py-4">{error}</p>
        )}

        {!loading && !error && tickets.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No tickets assigned in this sprint.
          </p>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="divide-y text-sm">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span>Title</span>
              <span>Status</span>
              <span>Size</span>
              <span>Due</span>
            </div>
            {tickets.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 py-2 items-center"
              >
                <Link
                  href={`/tickets/${t.id}`}
                  className="truncate font-medium hover:underline text-foreground flex items-center gap-1 group"
                  onClick={onClose}
                >
                  <span className="truncate">{t.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" aria-hidden />
                </Link>
                <Badge
                  variant="outline"
                  className={`text-xs whitespace-nowrap ${STATUS_BADGE_STYLES[t.status] ?? ""}`}
                >
                  {STATUS_LABELS[t.status] ?? t.status}
                </Badge>
                <span className="text-xs text-muted-foreground w-6 text-center">
                  {t.size ? SIZE_LABELS[t.size] : "—"}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {t.dueDate ? formatDate(t.dueDate) : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
