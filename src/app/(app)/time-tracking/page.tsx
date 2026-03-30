// SPEC: sprint-scrum.md
// SPEC: design-improvements.md
import { db } from "@/lib/db";
import {
  TimeTrackingReport,
  type TimeLogRow,
  type UserOption,
  type SprintOption,
} from "@/components/time/TimeTrackingReport";
import { DataSubNav } from "@/components/data/DataSubNav";

interface PageProps {
  searchParams: Promise<{
    userId?: string;
    sprintId?: string;
    teamFilter?: string;
  }>;
}

export default async function TimeTrackingPage({ searchParams }: PageProps) {
  const { userId, sprintId } = await searchParams;

  const [rawLogs, users, sprints] = await Promise.all([
    db.timeLog.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(sprintId ? { ticket: { sprintId } } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
        ticket: {
          select: {
            id: true,
            title: true,
            team: true,
            sprintId: true,
            sprint: { select: { name: true } },
          },
        },
      },
      orderBy: { loggedAt: "desc" },
      take: 500,
    }),
    db.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.sprint.findMany({
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  // Serialize dates for the client
  const logs: TimeLogRow[] = rawLogs.map((log) => ({
    id: log.id,
    hours: log.hours,
    note: log.note,
    loggedAt: log.loggedAt.toISOString(),
    user: log.user,
    ticket: {
      id: log.ticket.id,
      title: log.ticket.title,
      team: log.ticket.team,
      sprintId: log.ticket.sprintId,
      sprint: log.ticket.sprint,
    },
  }));

  const userOptions: UserOption[] = users;
  const sprintOptions: SprintOption[] = sprints;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data &amp; Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hours logged by team members across tickets and sprints. Showing up to 500 most recent entries.
        </p>
      </div>
      <DataSubNav />
      <TimeTrackingReport
        logs={logs}
        users={userOptions}
        sprints={sprintOptions}
        initialUserId={userId}
        initialSprintId={sprintId}
      />
    </div>
  );
}
