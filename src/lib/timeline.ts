// SPEC: roadmap.md

/**
 * Convert a date to a percentage position along a timeline.
 * @param date Target date
 * @param start Timeline start
 * @param end Timeline end
 * @returns 0–100 percentage (clamped)
 */
export function dateToPercent(date: Date, start: Date, end: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;
  const offset = date.getTime() - start.getTime();
  return Math.max(0, Math.min(100, (offset / total) * 100));
}

/**
 * Build the array of month label markers for the timeline header.
 */
export function buildMonthMarkers(
  start: Date,
  end: Date
): { label: string; pct: number }[] {
  const markers: { label: string; pct: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= end) {
    markers.push({
      label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      pct: dateToPercent(cursor, start, end),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return markers;
}
