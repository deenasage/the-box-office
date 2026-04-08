// SPEC: sprints.md
// SPEC: design-improvements.md
import { db } from "@/lib/db";
import { isTeamLead } from "@/lib/role-helpers";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, SIZE_HOURS } from "@/lib/utils";
import { TicketStatus, UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { BarChart2, Layers } from "lucide-react";
import { CreateSprintButton } from "@/components/sprints/CreateSprintButton";
import { SprintActionButtons } from "@/components/sprints/SprintActionButtons";
import { CloneSprintButton } from "@/components/sprints/CloneSprintButton";
import { SprintHealthBadge } from "@/components/sprints/SprintHealthBadge";
import { SprintGoalsRollup } from "@/components/sprints/SprintGoalsRollup";
import { VelocityTrend } from "@/components/sprints/VelocityTrend";
import { BacklogHealthIndicator } from "@/components/sprints/BacklogHealthIndicator";
import { SprintsTabBar } from "@/components/sprints/SprintsTabBar";
import { SprintCloseButton } from "@/components/sprints/SprintCloseButton";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SprintsPage({ searchParams }: PageProps) {
  const session = await auth();
  const isAdminOrLead =
    session?.user.role === UserRole.ADMIN ||
    isTeamLead(session?.user.role as UserRole);

  const { tab = "sprints" } = await searchParams;
  const activeTab =
    tab === "goals" ? "goals" : tab === "velocity" ? "velocity" : "sprints";

  const sprints = await db.sprint.findMany({
    include: {
      tickets: { select: { size: true, status: true } },
      capacities: { select: { points: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sprints</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <BacklogHealthIndicator />
          <Link
            href="/sprints/compare"
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-[0.8rem] font-medium hover:bg-muted transition-colors"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Compare
          </Link>
          <CreateSprintButton />
        </div>
      </div>

      {/* Tab bar — proper role="tablist" semantics via shadcn Tabs */}
      <SprintsTabBar activeTab={activeTab} />

      {activeTab === "goals" ? (
        <SprintGoalsRollup />
      ) : activeTab === "velocity" ? (
        <VelocityTrend />
      ) : (
        <div className="grid gap-3">
          {sprints.map((sprint) => {
            const committed = sprint.tickets.reduce(
              (s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0),
              0
            );
            const completed = sprint.tickets
              .filter((t) => t.status === TicketStatus.DONE)
              .reduce((s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0), 0);
            const blockedCount = sprint.tickets.filter(
              (t) => t.status === TicketStatus.BLOCKED
            ).length;
            const capacity = sprint.capacities.reduce((s, c) => s + c.points, 0);
            const loadPct = capacity > 0 ? Math.round((committed / capacity) * 100) : 0;
            const donePct = committed > 0 ? Math.round((completed / committed) * 100) : 0;

            return (
              <div key={sprint.id} className="relative group">
                {/* Full-card link — sits behind buttons via z-index */}
                <Link
                  href={`/sprints/${sprint.id}`}
                  className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`View sprint: ${sprint.name}`}
                />
                <Card className="hover:shadow-md hover:ring-1 hover:ring-primary/20 transition-all cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">
                          {sprint.name}
                        </CardTitle>
                        {sprint.isActive && <Badge variant="default">Active</Badge>}
                        {sprint.isActive && (
                          <SprintHealthBadge
                            completedHours={completed}
                            totalHours={committed}
                            startDate={sprint.startDate}
                            endDate={sprint.endDate}
                            blockedCount={blockedCount}
                          />
                        )}
                      </div>
                      {/* Buttons rendered above the overlay link (z-10) */}
                      <div className="relative z-10 flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                        </p>
                        {sprint.isActive && (
                          <SprintCloseButton
                            sprintId={sprint.id}
                            sprintName={sprint.name}
                            isActive={true}
                            isAdminOrLead={isAdminOrLead}
                          />
                        )}
                        {!sprint.isActive && isAdminOrLead && (
                          <CloneSprintButton sprintId={sprint.id} variant="icon" />
                        )}
                        {!sprint.isActive && (
                          <SprintActionButtons
                            sprintId={sprint.id}
                            sprintName={sprint.name}
                            isActive={false}
                            ticketCount={sprint.tickets.length}
                            userRole={session?.user.role ?? UserRole.MEMBER_CRAFT}
                          />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Tickets</p>
                        <p className="font-semibold tabular-nums">{sprint.tickets.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Committed</p>
                        <p className="font-semibold tabular-nums">{committed}h</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Capacity</p>
                        <p className={`font-semibold tabular-nums ${loadPct > 100 ? "text-red-600" : loadPct > 80 ? "text-amber-600" : "text-foreground"}`}>
                          {capacity > 0 ? `${loadPct}%` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Completed</p>
                        <p className="font-semibold tabular-nums text-primary">{completed}h</p>
                      </div>
                    </div>
                    {committed > 0 && (
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${donePct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{donePct}% of hours completed</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
          {sprints.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed rounded-lg">
              <Layers className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No sprints yet</p>
                <p className="text-sm text-muted-foreground">
                  Create a sprint to start planning and tracking work across teams.
                </p>
              </div>
              <CreateSprintButton />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
