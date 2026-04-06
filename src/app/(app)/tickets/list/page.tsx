// SPEC: tickets.md
import { Suspense } from "react";
import { db } from "@/lib/db";
import { Team, Hub, TicketStatus } from "@prisma/client";
import { z } from "zod";
import { TicketListTable } from "@/components/tickets/TicketListTable";
import { TicketViewToggle } from "@/components/tickets/TicketViewToggle";
import { PaginationBar } from "@/components/tickets/PaginationBar";
import { ListFilterBar } from "@/components/tickets/ListFilterBar";

const PAGE_SIZE = 50;

export default async function TicketsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    team?: string;
    status?: string;
    sprintId?: string;
    assigneeId?: string;
    hub?: string;
    carryover?: string;
    unsized?: string;
    page?: string;
  }>;
}) {
  const {
    team, status, sprintId, assigneeId, hub,
    carryover, unsized, page: pageParam,
  } = await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const validTeam     = z.nativeEnum(Team).safeParse(team).data;
  const validStatus   = z.nativeEnum(TicketStatus).safeParse(status).data;
  const validHub      = z.nativeEnum(Hub).safeParse(hub).data;
  const carryoverOnly = carryover === "1";
  const unsizedOnly   = unsized === "1";

  const where = {
    ...(validTeam     ? { team: validTeam }       : {}),
    ...(validStatus   ? { status: validStatus }   : {}),
    ...(validHub      ? { hub: validHub }         : {}),
    ...(assigneeId    ? { assigneeId }            : {}),
    ...(sprintId === "none" ? { sprintId: null }  : sprintId ? { sprintId } : {}),
    ...(carryoverOnly ? { isCarryover: true }     : {}),
    ...(unsizedOnly   ? { size: null }            : {}),
  };

  const [tickets, total, sprints, users] = await Promise.all([
    db.ticket.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true } },
        sprint: { select: { id: true, name: true } },
        epic: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.ticket.count({ where }),
    db.sprint.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true },
    }),
    db.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <TicketViewToggle />
      </div>

      {/* Filter bar — wrapped in Suspense because ListFilterBar uses useSearchParams */}
      <Suspense fallback={<div className="h-8" />}>
        <ListFilterBar sprints={sprints} users={users} />
      </Suspense>

      {/* TicketListTable and PaginationBar both call useSearchParams — wrap in Suspense */}
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
        <TicketListTable tickets={tickets} />
      </Suspense>
      <Suspense fallback={null}>
        <PaginationBar
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/tickets/list"
        />
      </Suspense>
    </div>
  );
}
