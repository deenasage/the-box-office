// SPEC: brief-to-epic-workflow.md
// Sync helper — called whenever an Epic's endDate or name changes.
// Creates or updates the RoadmapItem linked to the epic.
// If titleManuallyEdited is true on an existing item, the title is never overwritten.

import type { Prisma } from "@prisma/client";
import { RoadmapItemStatus } from "@prisma/client";

/**
 * Accepts a Prisma transaction client so it can be composed inside a
 * db.$transaction(async (tx) => { ... }) call without nesting transactions.
 *
 * Behaviour:
 *  - endDate null  → no-op (cannot place on roadmap without a target month)
 *  - No existing RoadmapItem → create with status NOT_STARTED, titleManuallyEdited false
 *  - Existing item
 *      - Always update period
 *      - Only update title when titleManuallyEdited is false
 *      - Never flip titleManuallyEdited back to false once true
 */
export async function syncRoadmapItem(
  tx: Prisma.TransactionClient,
  epicId: string,
  epicName: string,
  endDate: Date | null
): Promise<void> {
  // Nothing to sync — roadmap requires a target month
  if (!endDate) return;

  // Format as "YYYY-MM"
  const year = endDate.getUTCFullYear();
  const month = String(endDate.getUTCMonth() + 1).padStart(2, "0");
  const period = `${year}-${month}`;

  const existing = await tx.roadmapItem.findFirst({
    where: { epicId },
    select: { id: true, titleManuallyEdited: true },
  });

  if (!existing) {
    await tx.roadmapItem.create({
      data: {
        epicId,
        title: epicName,
        period,
        status: RoadmapItemStatus.NOT_STARTED,
        titleManuallyEdited: false,
      },
    });
    return;
  }

  // Update period unconditionally; only overwrite title when not manually edited
  await tx.roadmapItem.update({
    where: { id: existing.id },
    data: {
      period,
      ...(!existing.titleManuallyEdited ? { title: epicName } : {}),
    },
  });
}
