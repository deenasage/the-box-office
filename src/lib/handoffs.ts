// SPEC: handoffs
import { db } from "@/lib/db";
import { Team, TicketStatus, DependencyType } from "@prisma/client";

export interface HandoffDependency {
  id: string;
  blocker: {
    id: string;
    title: string;
    status: TicketStatus;
    team: Team;
    sprint: { id: string; name: string; startDate: string } | null;
  };
  dependent: {
    id: string;
    title: string;
    status: TicketStatus;
    team: Team;
    sprint: { id: string; name: string; startDate: string } | null;
  };
  sequencing: "correct" | "same-sprint" | "inverted" | "unscheduled";
}

// Shared sprint select shape used in both query functions
const ticketSelect = {
  id: true,
  title: true,
  status: true,
  team: true,
  sprintId: true,
  sprint: {
    select: { id: true, name: true, startDate: true },
  },
} as const;

function computeSequencing(
  blockerSprint: { id: string; startDate: Date } | null,
  dependentSprint: { id: string; startDate: Date } | null
): HandoffDependency["sequencing"] {
  if (!blockerSprint || !dependentSprint) return "unscheduled";
  if (blockerSprint.id === dependentSprint.id) return "same-sprint";
  if (blockerSprint.startDate < dependentSprint.startDate) return "correct";
  return "inverted";
}

function toHandoff(dep: {
  id: string;
  fromTicket: {
    id: string;
    title: string;
    status: TicketStatus;
    team: Team;
    sprint: { id: string; name: string; startDate: Date } | null;
  };
  toTicket: {
    id: string;
    title: string;
    status: TicketStatus;
    team: Team;
    sprint: { id: string; name: string; startDate: Date } | null;
  };
}): HandoffDependency {
  return {
    id: dep.id,
    blocker: {
      id: dep.fromTicket.id,
      title: dep.fromTicket.title,
      status: dep.fromTicket.status,
      team: dep.fromTicket.team,
      sprint: dep.fromTicket.sprint
        ? {
            id: dep.fromTicket.sprint.id,
            name: dep.fromTicket.sprint.name,
            startDate: dep.fromTicket.sprint.startDate.toISOString(),
          }
        : null,
    },
    dependent: {
      id: dep.toTicket.id,
      title: dep.toTicket.title,
      status: dep.toTicket.status,
      team: dep.toTicket.team,
      sprint: dep.toTicket.sprint
        ? {
            id: dep.toTicket.sprint.id,
            name: dep.toTicket.sprint.name,
            startDate: dep.toTicket.sprint.startDate.toISOString(),
          }
        : null,
    },
    sequencing: computeSequencing(dep.fromTicket.sprint, dep.toTicket.sprint),
  };
}

/**
 * Returns all BLOCKS dependencies where the two tickets belong to different
 * teams AND at least one ticket is in the given sprint.
 */
export async function getHandoffsForSprint(
  sprintId: string
): Promise<HandoffDependency[]> {
  const deps = await db.ticketDependency.findMany({
    where: {
      type: DependencyType.BLOCKS,
      OR: [
        { fromTicket: { sprintId } },
        { toTicket: { sprintId } },
      ],
    },
    select: {
      id: true,
      fromTicket: { select: ticketSelect },
      toTicket: { select: ticketSelect },
    },
  });

  return deps
    .filter((d) => d.fromTicket.team !== d.toTicket.team)
    .map(toHandoff);
}

/**
 * Returns all BLOCKS dependencies involving a specific ticket where the two
 * tickets belong to different teams. Used by the kanban card badge API.
 */
export async function getHandoffsForTicket(
  ticketId: string
): Promise<HandoffDependency[]> {
  const deps = await db.ticketDependency.findMany({
    where: {
      type: DependencyType.BLOCKS,
      OR: [{ fromTicketId: ticketId }, { toTicketId: ticketId }],
    },
    select: {
      id: true,
      fromTicket: { select: ticketSelect },
      toTicket: { select: ticketSelect },
    },
  });

  return deps
    .filter((d) => d.fromTicket.team !== d.toTicket.team)
    .map(toHandoff);
}
