// SPEC: tickets.md
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Team, TicketStatus } from "@prisma/client";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { DashboardData } from "@/components/dashboard/DashboardClient";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in14Days = new Date(today);
  in14Days.setDate(in14Days.getDate() + 14);

  const notDone = {
    status: { notIn: [TicketStatus.DONE] as TicketStatus[] },
  };

  const [
    openTickets,
    inProgressTickets,
    overdueTickets,
    myOpenTickets,
    activeSprint,
    myTickets,
    recentActivity,
    upcomingDueDates,
  ] = await Promise.all([
    // Total open (not DONE)
    db.ticket.count({ where: notDone }),

    // In progress
    db.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),

    // Overdue: dueDate < today and not done
    db.ticket.count({
      where: {
        ...notDone,
        dueDate: { lt: today },
      },
    }),

    // My open tickets count
    db.ticket.count({
      where: {
        ...notDone,
        assigneeId: userId,
      },
    }),

    // Active sprint — dates serialized to ISO strings for client boundary
    db.sprint.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        notes: true,
      },
    }),

    // My tickets — up to 8, not done, most recently updated first
    db.ticket.findMany({
      where: {
        ...notDone,
        assigneeId: userId,
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        team: true,
        size: true,
      },
    }),

    // Recent activity — last 10 status changes
    db.ticketStatusHistory.findMany({
      take: 10,
      orderBy: { changedAt: "desc" },
      select: {
        id: true,
        ticketId: true,
        fromStatus: true,
        toStatus: true,
        changedAt: true,
        ticket: { select: { title: true } },
        changedBy: { select: { name: true } },
      },
    }),

    // Upcoming due dates — due in next 14 days, not done, ordered by dueDate asc
    db.ticket.findMany({
      where: {
        ...notDone,
        dueDate: {
          gte: today,
          lte: in14Days,
        },
      },
      take: 8,
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        assignee: { select: { name: true } },
      },
    }),
  ]);

  // Serialize all Date objects to ISO strings before crossing the server/client boundary
  const data: DashboardData = {
    stats: {
      openTickets,
      inProgressTickets,
      overdueTickets,
      myOpenTickets,
    },
    activeSprint: activeSprint
      ? {
          id: activeSprint.id,
          name: activeSprint.name,
          startDate: activeSprint.startDate.toISOString(),
          endDate: activeSprint.endDate.toISOString(),
          notes: activeSprint.notes,
        }
      : null,
    myTickets: myTickets.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      team: t.team,
      size: t.size,
    })),
    recentActivity: recentActivity.map((r) => ({
      id: r.id,
      ticketId: r.ticketId,
      ticketTitle: r.ticket.title,
      from: r.fromStatus ?? null,
      to: r.toStatus,
      changedAt: r.changedAt.toISOString(),
      changedBy: { name: r.changedBy.name },
    })),
    upcomingDueDates: upcomingDueDates.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      status: t.status,
      assignee: t.assignee,
    })),
  };

  // Sprint battery: count tickets by status for the active sprint
  const sprintStatusCounts = activeSprint
    ? await db.ticket.groupBy({
        by: ["status"],
        where: { sprintId: activeSprint.id },
        _count: { id: true },
      })
    : [];

  // Two groupBy queries replace 24 individual count queries (6 teams × 4 statuses)
  const TEAMS = Object.values(Team);
  const [statusCounts, doneSprintCounts] = await Promise.all([
    db.ticket.groupBy({ by: ["team", "status"], _count: { id: true } }),
    db.ticket.groupBy({
      by: ["team"],
      where: { status: TicketStatus.DONE, sprint: { isActive: true } },
      _count: { id: true },
    }),
  ]);
  const teamStats = TEAMS.map((team) => {
    const rows = statusCounts.filter((r) => r.team === team);
    const count = (s: TicketStatus) => rows.find((r) => r.status === s)?._count.id ?? 0;
    const doneThisSprint = doneSprintCounts.find((r) => r.team === team)?._count.id ?? 0;
    return {
      team,
      backlog:    count(TicketStatus.BACKLOG),
      todo:       count(TicketStatus.TODO),
      ready:      count(TicketStatus.READY),
      inProgress: count(TicketStatus.IN_PROGRESS),
      inReview:   count(TicketStatus.IN_REVIEW),
      blocked:    count(TicketStatus.BLOCKED),
      doneThisSprint,
    };
  });

  const serializedSprintStatusCounts = sprintStatusCounts.map((r) => ({
    status: r.status,
    count: r._count.id,
  }));

  return (
    <DashboardClient
      data={data}
      userName={session.user.name ?? ""}
      teamStats={teamStats}
      sprintStatusCounts={serializedSprintStatusCounts}
    />
  );
}
