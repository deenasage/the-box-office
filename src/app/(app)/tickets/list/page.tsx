// SPEC: tickets.md
import { Suspense } from "react";
import { db } from "@/lib/db";
import { Team, TicketStatus } from "@prisma/client";
import { z } from "zod";
import { TicketListTable } from "@/components/tickets/TicketListTable";
import { TicketViewToggle } from "@/components/tickets/TicketViewToggle";
import { PaginationBar } from "@/components/tickets/PaginationBar";

const PAGE_SIZE = 50;

export default async function TicketsListPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; status?: string; sprintId?: string; page?: string }>;
}) {
  const { team, status, sprintId, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const teamParsed = z.nativeEnum(Team).safeParse(team);
  const validTeam = teamParsed.success ? teamParsed.data : undefined;

  const statusParsed = z.nativeEnum(TicketStatus).safeParse(status);
  const validStatus = statusParsed.success ? statusParsed.data : undefined;

  const where = {
    ...(validTeam ? { team: validTeam } : {}),
    ...(validStatus ? { status: validStatus } : {}),
    ...(sprintId === "none" ? { sprintId: null } : sprintId ? { sprintId } : {}),
  };

  const [tickets, total] = await Promise.all([
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
  ]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <TicketViewToggle />
      </div>
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
