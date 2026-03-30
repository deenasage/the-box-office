// SPEC: roadmap.md
"use client";

import { dateToPercent } from "@/lib/timeline";
import { TicketStatus } from "@prisma/client";
import type { RoadmapEpic } from "@/types";
import { EpicDragBar } from "./EpicDragBar";

interface EpicRowProps {
  epic: RoadmapEpic;
  timelineStart: Date;
  timelineEnd: Date;
  containerWidth: number;
  onReschedule: (epicId: string, start: Date, end: Date) => void;
}

export function EpicRow({
  epic,
  timelineStart,
  timelineEnd,
  containerWidth,
  onReschedule,
}: EpicRowProps) {
  const timelineDays =
    (timelineEnd.getTime() - timelineStart.getTime()) / 86400000;
  const pixelsPerDay = containerWidth / Math.max(1, timelineDays);

  if (!epic.startDate || !epic.endDate) {
    return (
      <div className="relative h-12 hover:bg-muted/20 transition-colors flex items-center px-2">
        <span className="text-xs text-muted-foreground italic px-2 border border-dashed rounded">
          No dates set
        </span>
        <span className="ml-2 text-xs text-muted-foreground truncate max-w-[120px]">
          {epic.name}
        </span>
      </div>
    );
  }

  const start = new Date(epic.startDate);
  const end = new Date(epic.endDate);
  const leftPct = dateToPercent(start, timelineStart, timelineEnd);
  const rightPct = dateToPercent(end, timelineStart, timelineEnd);
  const widthPct = Math.max(1, rightPct - leftPct);
  const leftPx = (leftPct / 100) * containerWidth;
  const widthPx = Math.max(40, (widthPct / 100) * containerWidth);

  const total = epic.tickets.length;
  const done = epic.tickets.filter(
    (t) => t.status === TicketStatus.DONE
  ).length;
  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="relative h-12 hover:bg-muted/20 transition-colors">
      <EpicDragBar
        epic={epic}
        left={leftPx}
        width={widthPx}
        donePct={donePct}
        total={total}
        done={done}
        pixelsPerDay={pixelsPerDay}
        onReschedule={onReschedule}
      />
    </div>
  );
}
