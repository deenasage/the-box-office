// SPEC: roadmap.md
"use client";

import { buildMonthMarkers, dateToPercent } from "@/lib/timeline";

interface TimelineGridProps {
  timelineStart: Date;
  timelineEnd: Date;
}

/**
 * Renders the background grid layer of the roadmap timeline:
 * - Month column headers with vertical dividers
 * - A "Today" marker line positioned at the current date
 *
 * Used as a presentational backdrop; all epic rows and sprint bands
 * are rendered on top of this inside RoadmapTimeline.
 */
export function TimelineGrid({ timelineStart, timelineEnd }: TimelineGridProps) {
  const months = buildMonthMarkers(timelineStart, timelineEnd);
  const todayPct = dateToPercent(new Date(), timelineStart, timelineEnd);

  return (
    <>
      {/* Month header */}
      <div className="relative h-8 border-b bg-muted/50">
        {months.map((m) => (
          <div
            key={m.label}
            className="absolute top-0 h-full flex items-center border-l border-border/50 px-1.5"
            style={{ left: `${m.pct}%` }}
          >
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* Today marker — rendered as a sibling so it can span the full epic area */}
      {todayPct >= 0 && todayPct <= 100 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
          style={{ left: `${todayPct}%` }}
          aria-label="Today"
        >
          <span className="absolute top-8 left-1 text-xs text-primary whitespace-nowrap font-semibold">
            Today
          </span>
        </div>
      )}
    </>
  );
}
