// SPEC: tickets.md
// SPEC: design-improvements.md
import Link from "next/link";
import { CalendarDays, AlertTriangle, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DueDatePill } from "@/components/dashboard/DueDatePill";
import type { TicketStatus } from "@prisma/client";

interface UpcomingTicket {
  id: string;
  title: string;
  dueDate: string | null;
  status: TicketStatus;
  assignee: { name: string } | null;
}

interface UpcomingDueDatesCardProps {
  tickets: UpcomingTicket[];
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  BACKLOG:     "Backlog",
  TODO:        "Prioritized",
  READY:       "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW:   "In Review",
  BLOCKED:     "Blocked",
  DONE:        "Done",
};

const STATUS_BADGE_STYLES: Record<TicketStatus, string> = {
  BACKLOG:     "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  TODO:        "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  READY:       "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  IN_PROGRESS: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  IN_REVIEW:   "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  BLOCKED:     "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  DONE:        "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
};

// ── Sub-component: a single deadline row ──────────────────────────────────────

interface DeadlineRowProps {
  ticket: UpcomingTicket;
  isOverdue: boolean;
}

function DeadlineRow({ ticket, isOverdue }: DeadlineRowProps) {
  return (
    <li>
      <Link
        href={`/tickets/${ticket.id}`}
        className="group flex items-center gap-3 py-2 -mx-4 px-4 hover:bg-muted/50 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Urgency indicator stripe */}
        <span
          className={`shrink-0 w-0.5 h-7 rounded-full ${
            isOverdue ? "bg-red-500" : "bg-amber-400"
          }`}
          aria-hidden="true"
        />

        {/* Title + assignee */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium leading-tight group-hover:text-primary transition-colors">
            {ticket.title}
          </p>
          {ticket.assignee ? (
            <span className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <User className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{ticket.assignee.name}</span>
            </span>
          ) : (
            <span className="mt-0.5 text-xs text-muted-foreground/50 italic">Unassigned</span>
          )}
        </div>

        {/* Status badge + due date pill */}
        <div className="shrink-0 flex items-center gap-1.5">
          <span
            className={`hidden sm:inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
              STATUS_BADGE_STYLES[ticket.status]
            }`}
          >
            {STATUS_LABELS[ticket.status]}
          </span>
          {ticket.dueDate && <DueDatePill dueDate={ticket.dueDate} />}
        </div>
      </Link>
    </li>
  );
}

// ── Sub-component: a section group (Overdue / Upcoming) ───────────────────────

interface SectionGroupProps {
  label: string;
  icon: React.ReactNode;
  tickets: UpcomingTicket[];
  isOverdue: boolean;
}

function SectionGroup({ label, icon, tickets, isOverdue }: SectionGroupProps) {
  if (tickets.length === 0) return null;
  return (
    <div className="space-y-0">
      <div className={`flex items-center gap-1.5 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide ${
        isOverdue ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
      }`}>
        {icon}
        {label}
        <span className="ml-auto font-normal normal-case tracking-normal text-muted-foreground">
          {tickets.length}
        </span>
      </div>
      <ul aria-label={`${label} tickets`} className="space-y-0">
        {tickets.map((t) => (
          <DeadlineRow key={t.id} ticket={t} isOverdue={isOverdue} />
        ))}
      </ul>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function UpcomingDueDatesCard({ tickets }: UpcomingDueDatesCardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = tickets.filter(
    (t) => t.dueDate && new Date(t.dueDate) < today
  );
  const upcoming = tickets.filter(
    (t) => t.dueDate && new Date(t.dueDate) >= today
  );

  const totalCount = tickets.length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b pb-3 shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Deadlines
          {totalCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs tabular-nums">
              {overdue.length > 0 && (
                <span className="text-red-600 dark:text-red-400 mr-1">
                  {overdue.length} overdue
                </span>
              )}
              {overdue.length > 0 && upcoming.length > 0 && (
                <span className="text-muted-foreground">·</span>
              )}
              {upcoming.length > 0 && (
                <span className="ml-1">{upcoming.length} upcoming</span>
              )}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 pt-0 overflow-y-auto">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
            <p className="text-sm font-medium text-muted-foreground">No open deadlines</p>
            <p className="text-xs text-muted-foreground/70">
              Tickets with due dates will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            <SectionGroup
              label="Overdue"
              icon={<AlertTriangle className="h-3 w-3" aria-hidden="true" />}
              tickets={overdue}
              isOverdue
            />
            <SectionGroup
              label="Upcoming"
              icon={<Clock className="h-3 w-3" aria-hidden="true" />}
              tickets={upcoming}
              isOverdue={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
