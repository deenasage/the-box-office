// SPEC: sprint-scrum.md
import { db } from "@/lib/db";
import { TicketSize, TicketStatus, Team } from "@prisma/client";
import { AnalyticsClient, type AnalyticsData } from "@/components/analytics/AnalyticsClient";

// Build an ISO week label like "Jan 6" from a Date
function weekLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AnalyticsPage() {
  // ── 1. Ticket volume by team ────────────────────────────────────────────────
  const byTeamRaw = await db.ticket.groupBy({
    by: ["team"],
    _count: { id: true },
  });

  // ── 2. Ticket volume by status ──────────────────────────────────────────────
  const byStatusRaw = await db.ticket.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  // ── 3. Tickets created per week (last 12 weeks) ─────────────────────────────
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 * 7

  const recentTickets = await db.ticket.findMany({
    where: { createdAt: { gte: twelveWeeksAgo } },
    select: { createdAt: true },
  });

  // Build 12 buckets — one per week, starting from twelveWeeksAgo
  const buckets: { start: Date; count: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(twelveWeeksAgo);
    start.setDate(start.getDate() + i * 7);
    buckets.push({ start, count: 0 });
  }
  for (const t of recentTickets) {
    const msFromStart = t.createdAt.getTime() - twelveWeeksAgo.getTime();
    const weekIndex = Math.min(11, Math.floor(msFromStart / (7 * 24 * 60 * 60 * 1000)));
    if (weekIndex >= 0) buckets[weekIndex].count++;
  }

  const weeklyCreation = buckets.map((b) => ({
    weekLabel: weekLabel(b.start),
    count: b.count,
  }));

  // ── 4. Throughput: tickets DONE per sprint (last 6 completed) ───────────────
  const recentSprints = await db.sprint.findMany({
    where: { isActive: false },
    orderBy: { endDate: "desc" },
    take: 6,
    include: { tickets: { select: { status: true } } },
  });

  const throughputBySprint = recentSprints
    .map((sprint) => ({
      sprintName: sprint.name,
      doneCount: sprint.tickets.filter((t) => t.status === TicketStatus.DONE).length,
      totalCount: sprint.tickets.length,
    }))
    .reverse(); // chronological order

  // ── 5. Total tickets ────────────────────────────────────────────────────────
  const totalTickets = await db.ticket.count();

  // ── 6. Size distribution ────────────────────────────────────────────────────
  const bySizeRaw = await db.ticket.groupBy({
    by: ["size"],
    _count: { id: true },
    where: { size: { not: null } },
  });

  const sizedTotal = bySizeRaw.reduce((s, r) => s + r._count.id, 0);
  const allSizes: TicketSize[] = ["XS", "S", "M", "L", "XL", "XXL"];
  const sizeDistribution = allSizes.map((size) => {
    const entry = bySizeRaw.find((r) => r.size === size);
    const count = entry?._count.id ?? 0;
    return {
      size,
      count,
      pct: sizedTotal > 0 ? Math.round((count / sizedTotal) * 100) : 0,
    };
  });

  // ── Assemble ─────────────────────────────────────────────────────────────────
  const allTeams: Team[] = ["CONTENT", "DESIGN", "SEO", "WEM", "PAID_MEDIA", "ANALYTICS"];
  const allStatuses: TicketStatus[] = [
    "BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE",
  ];

  const data: AnalyticsData = {
    ticketsByTeam: allTeams
      .map((team) => ({
        team,
        count: byTeamRaw.find((r) => r.team === team)?._count.id ?? 0,
      }))
      .filter((r) => r.count > 0),

    ticketsByStatus: allStatuses.map((status) => ({
      status,
      count: byStatusRaw.find((r) => r.status === status)?._count.id ?? 0,
    })),

    weeklyCreation,
    throughputBySprint,
    sizeDistribution,
    totalTickets,
  };

  return <AnalyticsClient data={data} />;
}
