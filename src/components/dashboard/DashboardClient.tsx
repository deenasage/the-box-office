// SPEC: tickets.md
"use client";

import Link from "next/link";
import {
  CalendarDays,
  CircleDot,
  Inbox,
  ListTodo,
  User,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityFeedDashboard } from "@/components/dashboard/ActivityFeedDashboard";
import { SprintBatteryWidget } from "@/components/dashboard/SprintBatteryWidget";
import { TeamStatsSection } from "@/components/dashboard/TeamStatsSection";
import { UpcomingDueDatesCard } from "@/components/dashboard/UpcomingDueDatesCard";
import { formatDate } from "@/lib/utils";
import type { TicketStatus, TicketSize, Team, UserRole } from "@prisma/client";

const TEAM_LABELS: Record<string, string> = {
  CONTENT: "Content", DESIGN: "Design", SEO: "SEO",
  WEM: "WEM", PAID_MEDIA: "Paid Media", ANALYTICS: "Analytics",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  openTickets: number;
  inProgressTickets: number;
  overdueTickets: number;
  myOpenTickets: number;
}

interface ActiveSprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  notes: string | null;
}

interface MyTicket {
  id: string;
  title: string;
  status: TicketStatus;
  dueDate: string | null;
  team: Team;
  size: TicketSize | null;
}

interface UpcomingTicket {
  id: string;
  title: string;
  dueDate: string | null;
  status: TicketStatus;
  assignee: { name: string } | null;
}

interface ActivityItem {
  id: string;
  ticketId: string;
  ticketTitle: string;
  from: string | null;
  to: string;
  changedAt: string;
  changedBy: { name: string };
}

interface TeamStat {
  team: Team;
  backlog: number;
  todo: number;
  ready: number;
  inProgress: number;
  inReview: number;
  blocked: number;
  doneThisSprint: number;
}

interface SprintStatusCount {
  status: string;
  count: number;
}

export interface DashboardData {
  stats: Stats;
  activeSprint: ActiveSprint | null;
  myTickets: MyTicket[];
  recentActivity: ActivityItem[];
  upcomingDueDates: UpcomingTicket[];
}

const STATUS_LABELS: Record<string, string> = {
  BACKLOG:     "Backlog",
  TODO:        "Prioritized",
  READY:       "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW:   "In Review",
  BLOCKED:     "Blocked",
  DONE:        "Done",
};

// ── Main component ─────────────────────────────────────────────────────────────

interface DashboardClientProps {
  data: DashboardData;
  userName: string;
  teamStats: TeamStat[];
  sprintStatusCounts: SprintStatusCount[];
  effectiveTeam?: Team | null;
  effectiveRole?: UserRole | null;
  effectiveUserId?: string | null;
}

export function DashboardClient({ data, userName, teamStats, sprintStatusCounts, effectiveTeam, effectiveRole, effectiveUserId }: DashboardClientProps) {
  const { stats, activeSprint, recentActivity, upcomingDueDates } = data;

  const teamLabel = effectiveTeam ? (TEAM_LABELS[effectiveTeam] ?? effectiveTeam) : null;
  const isTeamLeadCraft = effectiveRole === "TEAM_LEAD_CRAFT" && !!teamLabel;
  const isMemberCraft = effectiveRole === "MEMBER_CRAFT";
  const isCraftScoped = isTeamLeadCraft || isMemberCraft;
  const isStakeholder = effectiveRole === "MEMBER_STAKEHOLDER" || effectiveRole === "TEAM_LEAD_STAKEHOLDER";
  const isAdmin = !effectiveRole || effectiveRole === "ADMIN";

  // Ticket links carry the correct filter for the viewer's role.
  // noSprint=1 tells the board not to auto-apply the active sprint on arrival.
  const teamTicketsHref = isTeamLeadCraft && effectiveTeam
    ? `/tickets?team=${effectiveTeam}&noSprint=1`
    : isMemberCraft && effectiveUserId
    ? `/tickets?assigneeId=${effectiveUserId}&noSprint=1`
    : "/tickets?noSprint=1";

  const isEmptyState =
    !activeSprint &&
    stats.openTickets === 0 &&
    recentActivity.length === 0;

  if (isEmptyState) {
    return (
      <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">The Box Office</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Welcome back, {userName}
            </p>
          </div>
          <Link
            href="/intake"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 hover:no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Submit request <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-3 mx-auto mb-4 w-fit">
            <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium">No activity yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Submit a request or create a sprint to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">The Box Office</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Welcome back, {userName}
          </p>
        </div>
        <Link
          href="/intake"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Submit request <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Stat cards */}
      <section aria-label="Summary statistics">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Open Tickets"
            value={stats.openTickets}
            sub={isCraftScoped ? `in ${teamLabel}` : isStakeholder ? "you submitted" : "across all teams"}
            icon={<ListTodo className="h-3.5 w-3.5" aria-hidden="true" />}
            accentClass="border-t-primary"
            href={teamTicketsHref}
          />
          <StatCard
            label="In Progress"
            value={stats.inProgressTickets}
            sub={isCraftScoped ? `${teamLabel} team` : isStakeholder ? "your requests" : "actively being worked"}
            icon={<CircleDot className="h-3.5 w-3.5" aria-hidden="true" />}
            accentClass="border-t-violet-400"
            href={`${teamTicketsHref}&status=IN_PROGRESS`}
          />
          <StatCard
            label="Overdue"
            value={stats.overdueTickets}
            sub={isCraftScoped ? `in ${teamLabel}` : "past due date"}
            icon={<AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
            accentClass="border-t-red-400"
            alertIfPositive
            href={teamTicketsHref}
          />
          <StatCard
            label={isCraftScoped && effectiveRole === "TEAM_LEAD_CRAFT" ? `My ${teamLabel} Tickets` : "My Open Tickets"}
            value={stats.myOpenTickets}
            sub={isStakeholder ? "submitted or assigned" : `assigned to ${userName}`}
            icon={<User className="h-3.5 w-3.5" aria-hidden="true" />}
            accentClass="border-t-sky-400"
            href="/my-work"
          />
        </div>
      </section>

      {/* Active sprint banner — entire card is clickable */}
      {activeSprint && (
        <section aria-label="Active sprint">
          <Link href={`/sprints/${activeSprint.id}`} className="block hover:no-underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
            <Card className="border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10 group-hover:bg-primary/10 dark:group-hover:bg-primary/15 transition-colors cursor-pointer">
              <CardContent className="flex flex-col gap-1 py-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <span className="font-semibold">{activeSprint.name}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {formatDate(activeSprint.startDate)} – {formatDate(activeSprint.endDate)}
                    </span>
                    {activeSprint.notes && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                        {activeSprint.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>
      )}

      {/* Sprint battery */}
      {activeSprint && sprintStatusCounts.length > 0 && (() => {
        const total = sprintStatusCounts.reduce((sum, s) => sum + s.count, 0);
        const STATUS_ORDER = ["BACKLOG", "TODO", "READY", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"];
        const segments = [...sprintStatusCounts]
          .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
          .map((s) => ({
            status: s.status,
            count: s.count,
            label: STATUS_LABELS[s.status] ?? s.status,
          }));
        return (
          <section aria-label="Sprint battery">
            <SprintBatteryWidget
              sprintName={activeSprint.name}
              statusCounts={segments}
              total={total}
            />
          </section>
        );
      })()}

      {/* Teams — admin only */}
      {isAdmin && (
        <section aria-label="Team stats">
          <TeamStatsSection teamStats={teamStats} highlightTeam={effectiveTeam ?? undefined} />
        </section>
      )}

      {/* Activity feed + Deadlines — side by side on large screens */}
      <section aria-label="Activity and deadlines">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Recent activity takes up 2/3 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CircleDot className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ActivityFeedDashboard items={recentActivity} />
              </CardContent>
            </Card>
          </div>

          {/* Deadlines takes up 1/3 */}
          <div className="lg:col-span-1">
            <UpcomingDueDatesCard tickets={upcomingDueDates} />
          </div>
        </div>
      </section>
    </div>
  );
}
