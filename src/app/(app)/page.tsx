// SPEC: tickets.md
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Team, TicketStatus, UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { DashboardData } from "@/components/dashboard/DashboardClient";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // ── Resolve effective user (admin "View as" impersonation) ───────────────────
  let userId     = session.user.id;
  let effectiveName = session.user.name ?? "";
  let effectiveRole: UserRole = session.user.role;
  let effectiveTeam: Team | null = session.user.team ?? null;

  if (session.user.role === UserRole.ADMIN) {
    const cookieStore = await cookies();
    const viewAsId = cookieStore.get("viewAsUserId")?.value ?? null;
    if (viewAsId) {
      const viewAsUser = await db.user.findUnique({
        where: { id: viewAsId },
        select: { id: true, name: true, role: true, team: true },
      });
      if (viewAsUser && viewAsUser.role !== UserRole.ADMIN) {
        userId        = viewAsUser.id;
        effectiveName = viewAsUser.name;
        effectiveRole = viewAsUser.role;
        effectiveTeam = viewAsUser.team;
      }
    }
  }

  // ── Scope queries by team for craft roles ────────────────────────────────────
  // ADMIN (non-impersonating): global view — no team filter.
  // TEAM_LEAD_CRAFT / MEMBER_CRAFT: scoped to their team.
  // Stakeholder roles: scoped to tickets they created/own.
  const isCraftRole =
    effectiveRole === UserRole.TEAM_LEAD_CRAFT ||
    effectiveRole === UserRole.MEMBER_CRAFT;
  const isStakeholderRole =
    effectiveRole === UserRole.MEMBER_STAKEHOLDER ||
    effectiveRole === UserRole.TEAM_LEAD_STAKEHOLDER;

  // teamClause is added to where conditions whenever we're in a team-scoped view
  const teamClause = isCraftRole && effectiveTeam ? { team: effectiveTeam } : {};
  // stakeholderClause limits to tickets the user created or is assigned to
  const stakeholderClause = isStakeholderRole
    ? { OR: [{ creatorId: userId }, { assigneeId: userId }] }
    : {};
  // Merge scope: craft → team filter; stakeholder → ownership filter; admin → nothing
  const scopeClause = isCraftRole ? teamClause : isStakeholderRole ? stakeholderClause : {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in14Days = new Date(today);
  in14Days.setDate(in14Days.getDate() + 14);

  const notDone = { status: { notIn: [TicketStatus.DONE] as TicketStatus[] } };

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
    // Open tickets — scoped to team/stakeholder
    db.ticket.count({ where: { ...notDone, ...scopeClause } }),

    // In progress — scoped
    db.ticket.count({ where: { status: TicketStatus.IN_PROGRESS, ...scopeClause } }),

    // Overdue — scoped
    db.ticket.count({ where: { ...notDone, ...scopeClause, dueDate: { lt: today } } }),

    // "My open" — for craft: tickets assigned to this specific user
    //             for stakeholder: tickets they created/are assigned to (not done)
    db.ticket.count({
      where: {
        ...notDone,
        ...(isStakeholderRole ? stakeholderClause : { assigneeId: userId }),
      },
    }),

    db.sprint.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, startDate: true, endDate: true, notes: true },
    }),

    // "My tickets" list — always personal assigned tickets
    db.ticket.findMany({
      where: {
        ...notDone,
        ...(isStakeholderRole ? stakeholderClause : { assigneeId: userId }),
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true, dueDate: true, team: true, size: true },
    }),

    // Recent activity — scoped to team when applicable
    db.ticketStatusHistory.findMany({
      take: 10,
      orderBy: { changedAt: "desc" },
      where: Object.keys(scopeClause).length > 0
        ? { ticket: scopeClause }
        : undefined,
      select: {
        id: true, ticketId: true, fromStatus: true, toStatus: true, changedAt: true,
        ticket: { select: { title: true } },
        changedBy: { select: { name: true } },
      },
    }),

    // Upcoming due dates — scoped
    db.ticket.findMany({
      where: { ...notDone, ...scopeClause, dueDate: { gte: today, lte: in14Days } },
      take: 8,
      orderBy: { dueDate: "asc" },
      select: {
        id: true, title: true, dueDate: true, status: true,
        assignee: { select: { name: true } },
      },
    }),
  ]);

  const data: DashboardData = {
    stats: { openTickets, inProgressTickets, overdueTickets, myOpenTickets },
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
      id: t.id, title: t.title, status: t.status,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      team: t.team, size: t.size,
    })),
    recentActivity: recentActivity.map((r) => ({
      id: r.id, ticketId: r.ticketId, ticketTitle: r.ticket.title,
      from: r.fromStatus ?? null, to: r.toStatus,
      changedAt: r.changedAt.toISOString(),
      changedBy: { name: r.changedBy.name },
    })),
    upcomingDueDates: upcomingDueDates.map((t) => ({
      id: t.id, title: t.title,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      status: t.status, assignee: t.assignee,
    })),
  };

  // Sprint battery — scoped to team when applicable
  const sprintStatusCounts = activeSprint
    ? await db.ticket.groupBy({
        by: ["status"],
        where: { sprintId: activeSprint.id, ...scopeClause },
        _count: { id: true },
      })
    : [];

  // Team stats — show all teams; the client highlights effectiveTeam if set
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
    status: r.status, count: r._count.id,
  }));

  return (
    <DashboardClient
      data={data}
      userName={effectiveName}
      teamStats={teamStats}
      sprintStatusCounts={serializedSprintStatusCounts}
      effectiveTeam={effectiveTeam}
      effectiveRole={effectiveRole}
    />
  );
}
