// SPEC: roadmap.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { dateToPercent } from "@/lib/timeline";
import type { RoadmapPayload } from "@/types";

type RoadmapSprint = RoadmapPayload["sprints"][number];

interface SprintMarkerProps {
  sprints: RoadmapSprint[];
  timelineStart: Date;
  timelineEnd: Date;
}

export function SprintMarker({
  sprints,
  timelineStart,
  timelineEnd,
}: SprintMarkerProps) {
  return (
    <div className="relative h-6 border-b bg-primary/5">
      {sprints.map((sprint) => {
        const left = dateToPercent(
          new Date(sprint.startDate),
          timelineStart,
          timelineEnd
        );
        const right = dateToPercent(
          new Date(sprint.endDate),
          timelineStart,
          timelineEnd
        );
        const width = right - left;
        if (width <= 0) return null;
        return (
          <div
            key={sprint.id}
            className="absolute top-1 bottom-1 bg-primary/20 border border-primary/30 rounded text-[11px] flex items-center px-1 overflow-hidden"
            style={{ left: `${left}%`, width: `${width}%` }}
            title={sprint.name}
          >
            {sprint.name}
          </div>
        );
      })}
    </div>
  );
}
