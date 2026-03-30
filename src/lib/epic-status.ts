// SPEC: portfolio-view.md
import { EpicStatus, BriefStatus, TicketStatus } from "@prisma/client";
import { db } from "@/lib/db";

interface EpicLike {
  status: EpicStatus;
}
interface BriefLike {
  status: BriefStatus;
}
interface TicketLike {
  status: TicketStatus;
}

/**
 * Pure function — no DB calls.
 * Priority order: CANCELLED → ON_HOLD → DONE → IN_PROGRESS → IN_PLANNING → BRIEFED → IN_BRIEF → INTAKE
 */
export function computeEpicStatus(
  epic: EpicLike,
  briefs: BriefLike[],
  tickets: TicketLike[]
): EpicStatus {
  // Manual overrides are sticky — never auto-compute these
  if (epic.status === EpicStatus.CANCELLED) return EpicStatus.CANCELLED;
  if (epic.status === EpicStatus.ON_HOLD) return EpicStatus.ON_HOLD;

  if (
    tickets.length > 0 &&
    tickets.every((t) => t.status === TicketStatus.DONE)
  )
    return EpicStatus.DONE;

  if (
    tickets.some(
      (t) =>
        t.status === TicketStatus.IN_PROGRESS ||
        t.status === TicketStatus.IN_REVIEW
    )
  )
    return EpicStatus.IN_PROGRESS;

  if (
    tickets.length > 0 &&
    tickets.every(
      (t) =>
        t.status === TicketStatus.BACKLOG || t.status === TicketStatus.TODO
    )
  )
    return EpicStatus.IN_PLANNING;

  if (
    briefs.some((b) => b.status === BriefStatus.FINALIZED) &&
    tickets.length === 0
  )
    return EpicStatus.BRIEFED;

  if (
    briefs.some(
      (b) =>
        b.status === BriefStatus.DRAFT || b.status === BriefStatus.REVIEW
    )
  )
    return EpicStatus.IN_BRIEF;

  return EpicStatus.INTAKE;
}

/**
 * Fetches the epic with its briefs and tickets, computes the derived status,
 * and persists the result if it has changed.
 * CANCELLED and ON_HOLD are sticky — computeEpicStatus will return them unchanged.
 * Returns the (possibly unchanged) EpicStatus, or null if the epic was not found.
 */
export async function syncEpicStatus(
  epicId: string
): Promise<EpicStatus | null> {
  const epic = await db.epic.findUnique({
    where: { id: epicId },
    select: {
      status: true,
      briefs: { select: { status: true } },
      tickets: { select: { status: true } },
    },
  });

  if (!epic) return null;

  const computed = computeEpicStatus(epic, epic.briefs, epic.tickets);

  if (computed !== epic.status) {
    await db.epic.update({
      where: { id: epicId },
      data: { status: computed },
    });
  }

  return computed;
}
