// SPEC: sprints.md
// SPEC: design-improvements.md
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatDate, SIZE_HOURS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { SizeBadge } from "@/components/tickets/SizeBadge";
import { TicketStatusBadge } from "@/components/dashboard/TicketStatusBadge";
import { SprintReport } from "@/components/sprints/SprintReport";
import { CapacityTable } from "@/components/sprints/CapacityTable";
import { BulkEstimateButton } from "@/components/sprints/BulkEstimateButton";
import { SprintActionButtons } from "@/components/sprints/SprintActionButtons";
import { CloneSprintButton } from "@/components/sprints/CloneSprintButton";
import { SprintCloseButton } from "@/components/sprints/SprintCloseButton";
import { BurndownChart } from "@/components/sprints/BurndownChart";
import { getBurndownData } from "@/lib/reports";
import { RetroNotesEditor } from "@/components/sprints/RetroNotesEditor";
import { DefinitionOfDone } from "@/components/sprints/DefinitionOfDone";
import { StandupView } from "@/components/sprints/StandupView";
import { SprintReviewChecklist } from "@/components/sprints/SprintReviewChecklist";
import { AddFromBacklog } from "@/components/sprints/AddFromBacklog";
import { AutoAssignTrigger } from "@/components/sprints/AutoAssignTrigger";
import { BacklogHealthIndicator } from "@/components/sprints/BacklogHealthIndicator";
import { SprintGoalEditor } from "@/components/sprints/SprintGoalEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketStatus, Team, UserRole } from "@prisma/client";
import Link from "next/link";
import { Info, Ticket } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RefinementTab } from "@/components/sprints/RefinementTab";

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const sprint = await db.sprint.findUnique({
    where: { id },
    include: {
      tickets: {
        include: { assignee: { select: { name: true } } },
        orderBy: [{ team: "asc" }, { status: "asc" }],
      },
      capacities: {
        include: { user: { select: { id: true, name: true, team: true } } },
      },
    },
  }).catch(() => null);

  if (sprint === null) {
    // null can mean not found OR a db error — both result in notFound for the user
    notFound();
  }

  let users, pastSprints, activeSprint, refinementTickets, burndownData;
  try {
    [users, pastSprints, activeSprint, refinementTickets, burndownData] = await Promise.all([
      db.user.findMany({ select: { id: true, name: true, team: true }, orderBy: { name: "asc" } }),
      db.sprint.findMany({ where: { id: { not: id }, isActive: false }, select: { tickets: { select: { size: true, status: true } } }, orderBy: { endDate: "desc" }, take: 6 }),
      db.sprint.findFirst({ where: { isActive: true }, select: { id: true, name: true } }),
      db.ticket.findMany({
        where: {
          AND: [
            {
              OR: [
                { sprintId: null, status: { in: [TicketStatus.BACKLOG, TicketStatus.TODO] } },
                { sprintId: id },
              ],
            },
            {
              OR: [{ size: null }, { assigneeId: null }],
            },
          ],
        },
        select: {
          id: true,
          title: true,
          team: true,
          size: true,
          priority: true,
          assigneeId: true,
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { priority: "desc" },
        take: 100,
      }),
      getBurndownData(id),
    ]);
  } catch {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Failed to load sprint data. Please refresh the page.</p>
      </div>
    );
  }
  const avgVelocity =
    pastSprints.length > 0
      ? Math.round(
          pastSprints.reduce(
            (sum, s) =>
              sum +
              s.tickets
                .filter((t) => t.status === TicketStatus.DONE)
                .reduce((h, t) => h + (t.size ? SIZE_HOURS[t.size] : 0), 0),
            0
          ) / pastSprints.length
        )
      : null;

  const committed = sprint.tickets.reduce(
    (s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0),
    0
  );
  const completed = sprint.tickets
    .filter((t) => t.status === TicketStatus.DONE)
    .reduce((s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0), 0);

  // Group tickets by team
  const byTeam = Object.values(Team).reduce<Record<Team, typeof sprint.tickets>>(
    (acc, team) => {
      acc[team] = sprint.tickets.filter((t) => t.team === team);
      return acc;
    },
    {} as Record<Team, typeof sprint.tickets>
  );

  const isAdminOrLead =
    session?.user.role === UserRole.ADMIN ||
    session?.user.role === UserRole.TEAM_LEAD;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs crumbs={[{ label: "Sprints", href: "/sprints" }, { label: sprint.name }]} />

      {/* ── Sprint header ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-tight">{sprint.name}</h1>
          {sprint.isActive && <Badge>Active</Badge>}
          {isAdminOrLead && (
            <>
              <SprintActionButtons
                sprintId={sprint.id}
                sprintName={sprint.name}
                isActive={sprint.isActive}
                ticketCount={sprint.tickets.length}
                userRole={session?.user.role ?? UserRole.MEMBER}
              />
              <CloneSprintButton sprintId={sprint.id} variant="labelled" />
              {/* Divider separates primary sprint actions from the destructive close action */}
              <span className="h-5 w-px bg-border mx-1" aria-hidden="true" />
              <SprintCloseButton
                sprintId={sprint.id}
                sprintName={sprint.name}
                isActive={sprint.isActive}
                isAdminOrLead={isAdminOrLead}
              />
            </>
          )}
        </div>

        {/* Active sprint warning — shown when viewing an inactive sprint while another is active */}
        {!sprint.isActive && activeSprint && activeSprint.id !== sprint.id && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20 text-sm">
            <Info className="h-4 w-4 shrink-0" />
            <span>Sprint <strong>{activeSprint.name}</strong> is currently active. Activating this sprint will deactivate it.</span>
          </div>
        )}

        {/* Sprint goal — prominent, inline-editable for ADMIN/TEAM_LEAD (Scrum Guide: every sprint must have a goal) */}
        <SprintGoalEditor
          sprintId={sprint.id}
          goal={sprint.goal}
          canEdit={isAdminOrLead}
        />

        {sprint.notes && <p className="text-muted-foreground text-sm">{sprint.notes}</p>}
        <p className="text-sm text-muted-foreground">
          {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
        </p>
      </div>

      {/* ── Ceremony tabs ─────────────────────────────────────────────────── */}
      {/*
        Scrum Guide 2020 ceremonies mapped to tabs:
          Overview  → Sprint Planning artefacts: stats, ticket list, capacity, DoD, burndown
          Standup   → Daily Scrum: per-assignee yesterday/today/blockers view
          Report    → Sprint Review: demo-ready tickets, committed vs completed summary
          Retro     → Sprint Retrospective: free-text retro notes, action item tracking
      */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="standup">Standup</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="retro">Retrospective</TabsTrigger>
          <TabsTrigger value="refinement">Refinement</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW tab ──────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Sprint stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Committed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{committed}h</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Done
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-green-600 dark:text-green-400">
                  {completed}h
                </p>
              </CardContent>
            </Card>
            {/* Velocity = rolling avg completed hours from last 3 sprints */}
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Avg Velocity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-primary">
                  {avgVelocity !== null ? `${avgVelocity}h` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">last 6 sprints</p>
              </CardContent>
            </Card>
            {/* Completion Rate = % of committed work that got done */}
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-primary">
                  {committed > 0 ? Math.round((completed / committed) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Backlog health — surfaces refinement needs inline on the sprint page */}
          <div>
            <BacklogHealthIndicator />
          </div>

          {/* Tickets by team */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Tickets</h2>
              {isAdminOrLead && (
                <div className="flex items-center gap-2 flex-wrap">
                  <BulkEstimateButton
                    sprintId={sprint.id}
                    unsizedCount={sprint.tickets.filter((t) => !t.size).length}
                  />
                  <AutoAssignTrigger
                    sprintId={sprint.id}
                    sprintName={sprint.name}
                    userRole={session?.user.role ?? "ADMIN"}
                    userTeam={session?.user.team ?? null}
                  />
                </div>
              )}
            </div>
            {Object.entries(byTeam).map(([team, tickets]) => {
              if (tickets.length === 0) return null;
              return (
                <div key={team}>
                  <div className="flex items-center gap-2 mb-2">
                    <TeamBadge team={team as Team} />
                    <span className="text-sm text-muted-foreground">{tickets.length} tickets</span>
                  </div>
                  <div className="divide-y border rounded-lg">
                    {tickets.map((t) => (
                      <Link
                        key={t.id}
                        href={`/tickets/${t.id}`}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <span className="flex-1 text-sm truncate">{t.title}</span>
                        <SizeBadge size={t.size} />
                        <TicketStatusBadge status={t.status} />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
            {sprint.tickets.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
                <Ticket className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">No tickets in this sprint yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add tickets from the backlog or move them here from another sprint.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Add from backlog */}
          {isAdminOrLead && (
            <div className="flex flex-col gap-2">
              <AddFromBacklog sprintId={sprint.id} currentTicketIds={sprint.tickets.map((t) => t.id)} />
            </div>
          )}

          {/* Capacity */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Team Capacity</h2>
            <CapacityTable
              sprintId={sprint.id}
              capacities={sprint.capacities}
              users={users}
              currentUserRole={session?.user.role}
              currentUserTeam={session?.user.team}
            />
          </div>

          {/* Burndown Chart */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Burndown</h2>
            <BurndownChart data={burndownData ?? []} />
          </div>

          {/* Definition of Done — SM must verify DoD before closing sprint */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Definition of Done</h2>
            <DefinitionOfDone sprintId={sprint.id} />
          </div>

          {/* Sprint Review checklist */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Sprint Review</h2>
            <SprintReviewChecklist sprintId={sprint.id} />
          </div>
        </TabsContent>

        {/* ── STANDUP tab ───────────────────────────────────────────────── */}
        {/*
          Daily Scrum (Scrum Guide 2020 §Daily Scrum):
          - Per-assignee view: yesterday (DONE updated in last 24h), today (IN_PROGRESS), blockers (BLOCKED)
          - Dated header anchors the standup to the current calendar day
        */}
        <TabsContent value="standup" className="space-y-4">
          <StandupView sprintId={sprint.id} />
        </TabsContent>

        {/* ── REPORT tab ────────────────────────────────────────────────── */}
        {/*
          Sprint Review (Scrum Guide 2020 §Sprint Review):
          - Committed vs. completed summary
          - Per-team breakdown
          - Demo-ready (DONE) ticket list surfaced via SprintReport
        */}
        <TabsContent value="report" className="space-y-4">
          <SprintReport sprintId={sprint.id} />
        </TabsContent>

        {/* ── RETRO tab ─────────────────────────────────────────────────── */}
        {/*
          Sprint Retrospective (Scrum Guide 2020 §Sprint Retrospective):
          - Free-text notes saved to sprint.retrospectiveNotes via PATCH /api/sprints/[id]
          - SM edits inline; Save Notes button commits to DB
        */}
        <TabsContent value="retro" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Capture what went well, what could be improved, and what the team commits to next sprint.
          </p>
          <RetroNotesEditor
            sprintId={sprint.id}
            initialNotes={sprint.retrospectiveNotes}
            initialActionItems={sprint.retroActionItems}
          />
        </TabsContent>

        {/* ── REFINEMENT tab ────────────────────────────────────────────── */}
        <TabsContent value="refinement" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tickets without a size or assignee. Size and assign them here before the next sprint.
          </p>
          <RefinementTab sprintId={sprint.id} tickets={refinementTickets ?? []} users={users ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
