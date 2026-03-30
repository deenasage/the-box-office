// SPEC: ai-copilot.md
import { db } from "@/lib/db";
import { DependencyType } from "@prisma/client";
import {
  detectSequencingWarnings,
  type SequencingWarning,
} from "@/lib/dependencies";

/** Fetch BLOCKS dependencies, build ticket map, and compute sequencing warnings */
export async function fetchDependencyContext(): Promise<SequencingWarning[]> {
  const dependenciesRaw = await db.ticketDependency.findMany({
    where: { type: DependencyType.BLOCKS },
    select: {
      fromTicketId: true,
      toTicketId: true,
      type: true,
      fromTicket: {
        select: {
          id: true,
          title: true,
          sprintId: true,
          sprint: { select: { name: true, startDate: true } },
        },
      },
      toTicket: {
        select: {
          id: true,
          title: true,
          sprintId: true,
          sprint: { select: { name: true, startDate: true } },
        },
      },
    },
  });

  const ticketMap = new Map(
    dependenciesRaw.flatMap((dep) => [
      [
        dep.fromTicket.id,
        {
          id: dep.fromTicket.id,
          title: dep.fromTicket.title,
          sprintId: dep.fromTicket.sprintId,
          sprintName: dep.fromTicket.sprint?.name ?? null,
          sprintStartDate: dep.fromTicket.sprint?.startDate ?? null,
        },
      ],
      [
        dep.toTicket.id,
        {
          id: dep.toTicket.id,
          title: dep.toTicket.title,
          sprintId: dep.toTicket.sprintId,
          sprintName: dep.toTicket.sprint?.name ?? null,
          sprintStartDate: dep.toTicket.sprint?.startDate ?? null,
        },
      ],
    ])
  );

  return detectSequencingWarnings(
    dependenciesRaw.map((d) => ({
      fromTicketId: d.fromTicketId,
      toTicketId: d.toTicketId,
      type: d.type,
    })),
    ticketMap
  );
}
