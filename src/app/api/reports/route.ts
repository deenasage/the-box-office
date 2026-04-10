// SPEC: reports.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { Team, TicketStatus } from "@prisma/client";
import { calcLeadTime, calcCycleTime, aggregateStats } from "@/lib/reports";
import { SIZE_HOURS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const rawTeam = searchParams.get("team");
  let teamFilter: Team | null = null;
  if (rawTeam !== null) {
    const teamResult = z.nativeEnum(Team).safeParse(rawTeam);
    if (!teamResult.success) {
      return NextResponse.json({ error: "Invalid team" }, { status: 400 });
    }
    teamFilter = teamResult.data;
  }
  const sprintId = searchParams.get("sprintId");

  try {
    switch (type) {
      case "lead-time":
        return NextResponse.json(await getLeadTime(teamFilter));
      case "cycle-time":
        return NextResponse.json(await getCycleTime(teamFilter));
      case "sprint-summary":
        return NextResponse.json(await getSprintSummary(sprintId));
      case "throughput":
        return NextResponse.json(await getThroughput(teamFilter));
      case "velocity":
        return NextResponse.json(await getVelocity());
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (err) {
    console.error("[reports]", err);
    return NextResponse.json({ error: "Failed to compute report" }, { status: 500 });
  }
}

async function getLeadTime(teamFilter: Team | null) {
  const tickets = await db.ticket.findMany({
    where: {
      status: TicketStatus.DONE,
      ...(teamFilter ? { team: teamFilter } : {}),
    },
    select: {
      team: true,
      createdAt: true,
      statusHistory: { select: { toStatus: true, changedAt: true } },
    },
  });

  const teams = Object.values(Team);
  const allValues: number[] = [];
  const byTeam = teams.map((team) => {
    const teamTickets = tickets.filter((t) => t.team === team);
    const values = teamTickets
      .map((t) => calcLeadTime(t.createdAt, t.statusHistory))
      .filter((v): v is number => v !== null);
    allValues.push(...values);
    return { team, ...aggregateStats(values) };
  });

  return { overall: aggregateStats(allValues), byTeam };
}

async function getCycleTime(teamFilter: Team | null) {
  const tickets = await db.ticket.findMany({
    where: {
      status: TicketStatus.DONE,
      ...(teamFilter ? { team: teamFilter } : {}),
    },
    select: {
      team: true,
      statusHistory: { select: { toStatus: true, changedAt: true } },
    },
  });

  const teams = Object.values(Team);
  const allValues: number[] = [];
  const byTeam = teams.map((team) => {
    const teamTickets = tickets.filter((t) => t.team === team);
    const values = teamTickets
      .map((t) => calcCycleTime(t.statusHistory))
      .filter((v): v is number => v !== null);
    allValues.push(...values);
    return { team, ...aggregateStats(values) };
  });

  return { overall: aggregateStats(allValues), byTeam };
}

async function getSprintSummary(sprintId: string | null) {
  const sprint = sprintId
    ? await db.sprint.findUnique({
        where: { id: sprintId },
        include: {
          tickets: {
            select: { team: true, status: true, size: true },
          },
        },
      })
    : await db.sprint.findFirst({
        where: { isActive: true },
        include: {
          tickets: {
            select: { team: true, status: true, size: true },
          },
        },
      });

  if (!sprint) return null;

  const teams = Object.values(Team);
  const byTeam = teams.map((team) => {
    const tickets = sprint.tickets.filter((t) => t.team === team);
    const completed = tickets.filter((t) => t.status === TicketStatus.DONE);
    const carried = tickets.filter((t) => t.status !== TicketStatus.DONE);
    const committedPoints = tickets.reduce((s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0), 0);
    const completedPoints = completed.reduce((s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0), 0);
    return {
      team,
      entered: tickets.length,
      completed: completed.length,
      carriedOver: carried.length,
      committedPoints,
      completedPoints,
    };
  });

  const totalEntered = sprint.tickets.length;
  const totalCompleted = sprint.tickets.filter((t) => t.status === TicketStatus.DONE).length;
  const totalCarriedOver = totalEntered - totalCompleted;
  const committedPoints = sprint.tickets.reduce((s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0), 0);
  const completedPoints = sprint.tickets
    .filter((t) => t.status === TicketStatus.DONE)
    .reduce((s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0), 0);

  // Carry-over rate is only meaningful for completed, past sprints.
  // For active sprints or sprints that haven't ended yet, return null.
  const now = new Date();
  const isCompletedPastSprint = !sprint.isActive && sprint.endDate < now;
  const carryOverRate = isCompletedPastSprint && totalEntered > 0
    ? Math.round((totalCarriedOver / totalEntered) * 100)
    : null;

  return {
    sprintId: sprint.id,
    sprintName: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    isActive: sprint.isActive,
    totalEntered,
    totalCompleted,
    totalCarriedOver,
    carryOverRate,
    committedPoints,
    completedPoints,
    byTeam,
  };
}

async function getVelocity() {
  // Last 6 completed (not active, past endDate) sprints — fetch newest first, then reverse for chronological order
  const sprintsDesc = await db.sprint.findMany({
    where: {
      isActive: false,
      endDate: { lt: new Date() },
    },
    include: {
      tickets: { select: { size: true, status: true } },
    },
    orderBy: { startDate: "desc" },
    take: 6,
  });

  const sprints = sprintsDesc.reverse();

  const rows = sprints.map((sprint) => {
    const committedHours = sprint.tickets.reduce(
      (s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0),
      0
    );
    const completedHours = sprint.tickets
      .filter((t) => t.status === TicketStatus.DONE)
      .reduce((s, t) => s + (t.size ? SIZE_HOURS[t.size] : 0), 0);
    return { name: sprint.name, committedHours, completedHours };
  });

  return { sprints: rows };
}

async function getThroughput(teamFilter: Team | null) {
  const sprints = await db.sprint.findMany({
    include: {
      tickets: {
        where: {
          status: TicketStatus.DONE,
          ...(teamFilter ? { team: teamFilter } : {}),
        },
        select: { team: true },
      },
    },
    orderBy: { startDate: "asc" },
    take: 8,
  });

  const teams = Object.values(Team);
  const bySprint = sprints.map((sprint) => ({
    sprintId: sprint.id,
    sprintName: sprint.name,
    completed: sprint.tickets.length,
    byTeam: teams.map((team) => ({
      team,
      completed: sprint.tickets.filter((t) => t.team === team).length,
    })),
  }));

  return { bySprint };
}
