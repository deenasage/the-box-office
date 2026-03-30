// SPEC: ai-copilot.md
import { db } from "@/lib/db";
import { TicketStatus, DependencyType, type Team, type TicketSize } from "@prisma/client";

export interface TicketSummary {
  id: string;
  title: string;
  team: Team;
  status: TicketStatus;
  size: TicketSize | null;
  assigneeName: string | null;
  sprintName: string | null;
  epicName: string | null;
  hasBlockers: boolean;
}

/** Fetch open tickets (status != DONE), limited to 200, shaped for copilot context */
export async function fetchTicketContext(): Promise<TicketSummary[]> {
  const openTicketsRaw = await db.ticket.findMany({
    where: { status: { not: TicketStatus.DONE } },
    select: {
      id: true,
      title: true,
      team: true,
      status: true,
      size: true,
      assignee: { select: { name: true } },
      sprint: { select: { name: true } },
      epic: { select: { name: true } },
      dependenciesTo: {
        where: { type: DependencyType.BLOCKS },
        select: { id: true },
      },
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return openTicketsRaw.map((t) => ({
    id: t.id,
    title: t.title,
    team: t.team,
    status: t.status,
    size: t.size,
    assigneeName: t.assignee?.name ?? null,
    sprintName: t.sprint?.name ?? null,
    epicName: t.epic?.name ?? null,
    hasBlockers: t.dependenciesTo.length > 0,
  }));
}
