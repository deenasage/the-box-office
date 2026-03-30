// SPEC: reports.md
import { db } from "@/lib/db";
import { TicketSize, TicketStatus } from "@prisma/client";

// ── Story-point map (mirrors SIZE_HOURS in utils.ts but uses canonical points) ─

const SIZE_POINTS: Record<TicketSize, number> = {
  XS: 1,
  S: 2,
  M: 3,
  L: 5,
  XL: 8,
  XXL: 13,
};

// ── Burndown data types ────────────────────────────────────────────────────────

export interface BurndownPoint {
  /** ISO date string, e.g. "2026-03-10" */
  date: string;
  /** Ideal remaining points for this day (linear from totalPoints → 0). */
  ideal: number;
  /**
   * Actual remaining points.
   * `undefined` for dates that are strictly in the future (past today and past
   * endDate) so the chart does not connect the line into the future.
   */
  actual: number | undefined;
}

/**
 * Compute burndown data for a sprint using real TicketStatusHistory records.
 *
 * Velocity definition used here:
 *   - A ticket is "completed on day D" if the EARLIEST `toStatus = DONE`
 *     transition that falls within [startDate, endDate] has `changedAt` on day D.
 *   - `actual` on day D = totalPoints − Σ points of tickets completed on or before D.
 *   - `ideal` on day D = round(totalPoints × (1 − D/totalDays)).
 *   - For dates after today (or after endDate when sprint is finished), `actual`
 *     is `undefined` so Recharts does not draw a line into the future.
 */
export async function getBurndownData(sprintId: string): Promise<BurndownPoint[]> {
  const sprint = await db.sprint.findUniqueOrThrow({
    where: { id: sprintId },
    include: {
      tickets: {
        select: {
          id: true,
          size: true,
          statusHistory: {
            where: { toStatus: TicketStatus.DONE },
            orderBy: { changedAt: "asc" },
            take: 1,
            select: { changedAt: true },
          },
        },
      },
    },
  });

  const totalPoints = sprint.tickets.reduce(
    (sum, t) => sum + (t.size ? (SIZE_POINTS[t.size] ?? 0) : 0),
    0
  );

  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);
  const today = new Date();

  // Days are inclusive: day 0 = start, day N = end.
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000)
  );

  // Build a lookup: ISO date string → points completed on that exact day.
  // Only count DONE transitions that fall within [startDate, endDate].
  const completedOnDay = new Map<string, number>();
  for (const ticket of sprint.tickets) {
    if (!ticket.size) continue;
    const doneAt = ticket.statusHistory[0]?.changedAt;
    if (!doneAt) continue;
    if (doneAt < start || doneAt > end) continue;
    const key = new Date(doneAt).toISOString().slice(0, 10);
    completedOnDay.set(key, (completedOnDay.get(key) ?? 0) + SIZE_POINTS[ticket.size]);
  }

  // Cutoff: the last day for which we plot actual data.
  // If the sprint has ended, use endDate; otherwise use today.
  const cutoff = today < end ? today : end;

  const result: BurndownPoint[] = [];
  let cumulativeDone = 0;

  for (let i = 0; i <= totalDays; i++) {
    const dayMs = start.getTime() + i * 86_400_000;
    const d = new Date(dayMs);
    const dateStr = d.toISOString().slice(0, 10);

    const ideal = Math.round(totalPoints * (1 - i / totalDays));

    let actual: number | undefined;
    if (d <= cutoff) {
      cumulativeDone += completedOnDay.get(dateStr) ?? 0;
      actual = totalPoints - cumulativeDone;
    }

    result.push({ date: dateStr, ideal, actual });
  }

  return result;
}

/** Returns the number of business days (Mon–Fri) between two dates. */
export function businessDaysBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let count = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor < endDay) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Median of a sorted array of numbers. */
export function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Percentile of a sorted array. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

interface HistoryEntry {
  toStatus: string;
  changedAt: Date;
}

/**
 * Lead time: ticket createdAt → LAST DONE transition.
 * Uses last (not first) DONE to handle re-opened tickets correctly.
 * Returns null if the ticket was never completed.
 */
export function calcLeadTime(
  createdAt: Date,
  history: HistoryEntry[]
): number | null {
  const lastDone = history
    .filter((h) => h.toStatus === "DONE")
    .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())[0];
  if (!lastDone) return null;
  return businessDaysBetween(createdAt, lastDone.changedAt);
}

/**
 * Cycle time: first IN_PROGRESS → LAST DONE transition after it.
 * Using last DONE (not first) handles re-opened tickets correctly.
 * Returns null if the ticket never reached IN_PROGRESS or was never completed.
 */
export function calcCycleTime(history: HistoryEntry[]): number | null {
  const sorted = [...history].sort(
    (a, b) => a.changedAt.getTime() - b.changedAt.getTime()
  );
  const started = sorted.find((h) => h.toStatus === "IN_PROGRESS");
  if (!started) return null;
  const lastDone = sorted
    .filter((h) => h.toStatus === "DONE" && h.changedAt > started.changedAt)
    .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())[0];
  if (!lastDone) return null;
  return businessDaysBetween(started.changedAt, lastDone.changedAt);
}

/** Aggregate stats (avg, median, p75, p95) from an array of values. */
export function aggregateStats(values: number[]) {
  if (values.length === 0) {
    return { avg: 0, median: 0, p75: 0, p95: 0, count: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length * 10) / 10;
  return {
    avg,
    median: Math.round(median(sorted) * 10) / 10,
    p75: Math.round(percentile(sorted, 75) * 10) / 10,
    p95: Math.round(percentile(sorted, 95) * 10) / 10,
    count: values.length,
  };
}
