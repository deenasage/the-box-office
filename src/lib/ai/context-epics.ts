// SPEC: ai-copilot.md
import { db } from "@/lib/db";
import { TicketStatus, type Team, type EpicStatus } from "@prisma/client";

export interface EpicSummary {
  id: string;
  name: string;
  status: EpicStatus;
  team: Team | null;
  ticketCounts: { total: number; done: number; inProgress: number };
  sprints: string[];
}

/** Fetch all epics with ticket counts and associated sprint names */
export async function fetchEpicContext(): Promise<EpicSummary[]> {
  const epicsRaw = await db.epic.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      team: true,
      tickets: {
        select: {
          id: true,
          status: true,
          sprint: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return epicsRaw.map((epic) => {
    const total = epic.tickets.length;
    const done = epic.tickets.filter((t) => t.status === TicketStatus.DONE).length;
    const inProgress = epic.tickets.filter(
      (t) => t.status === TicketStatus.IN_PROGRESS
    ).length;
    const sprintNames = [
      ...new Set(
        epic.tickets
          .map((t) => t.sprint?.name)
          .filter((n): n is string => n !== null && n !== undefined)
      ),
    ];
    return {
      id: epic.id,
      name: epic.name,
      status: epic.status,
      team: epic.team,
      ticketCounts: { total, done, inProgress },
      sprints: sprintNames,
    };
  });
}
