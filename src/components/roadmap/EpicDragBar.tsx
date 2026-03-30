// SPEC: roadmap.md
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { EpicStatusBadge } from "@/components/portfolio/EpicStatusBadge";
import { formatDate } from "@/lib/utils";
import { TicketStatus } from "@prisma/client";
import type { RoadmapEpic } from "@/types";

interface EpicDragBarProps {
  epic: RoadmapEpic;
  left: number;
  width: number;
  donePct: number;
  total: number;
  done: number;
  pixelsPerDay: number;
  onReschedule: (epicId: string, startDate: Date, endDate: Date) => void;
}

interface DragState {
  type: "move" | "resize-end";
  startX: number;
  originalStart: Date;
  originalEnd: Date;
}

export function EpicDragBar({
  epic,
  left,
  width,
  donePct,
  total,
  done,
  pixelsPerDay,
  onReschedule,
}: EpicDragBarProps) {
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [pendingLeft, setPendingLeft] = useState<number | null>(null);
  const [pendingWidth, setPendingWidth] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const didDragRef = useRef(false);

  // Use refs so event listeners don't capture stale state
  const draggingRef = useRef<DragState | null>(null);
  const pixelsPerDayRef = useRef(pixelsPerDay);
  const leftRef = useRef(left);
  const widthRef = useRef(width);
  useEffect(() => { pixelsPerDayRef.current = pixelsPerDay; }, [pixelsPerDay]);
  useEffect(() => { leftRef.current = left; }, [left]);
  useEffect(() => { widthRef.current = width; }, [width]);

  useEffect(() => {
    if (!dragging) return;
    draggingRef.current = dragging;

    function onMouseMove(e: MouseEvent) {
      const drag = draggingRef.current;
      if (!drag) return;
      const deltaX = e.clientX - drag.startX;
      const deltaDays = Math.round(deltaX / pixelsPerDayRef.current);
      const MS_PER_DAY = 86400000;

      if (drag.type === "move") {
        const newLeft = leftRef.current + deltaX;
        const newStart = new Date(drag.originalStart.getTime() + deltaDays * MS_PER_DAY);
        const newEnd = new Date(drag.originalEnd.getTime() + deltaDays * MS_PER_DAY);
        setPendingLeft(newLeft);
        setTooltip(`${formatDate(newStart.toISOString())} – ${formatDate(newEnd.toISOString())}`);
      } else {
        const newEnd = new Date(drag.originalEnd.getTime() + deltaDays * MS_PER_DAY);
        const newWidth = widthRef.current + deltaX;
        setPendingWidth(Math.max(20, newWidth));
        setTooltip(`Ends ${formatDate(newEnd.toISOString())}`);
      }

      if (Math.abs(deltaX) > 4) didDragRef.current = true;
    }

    function onMouseUp(e: MouseEvent) {
      const drag = draggingRef.current;
      if (!drag) return;
      const deltaX = e.clientX - drag.startX;
      const deltaDays = Math.round(deltaX / pixelsPerDayRef.current);
      const MS_PER_DAY = 86400000;

      if (deltaDays !== 0) {
        const newStart =
          drag.type === "move"
            ? new Date(drag.originalStart.getTime() + deltaDays * MS_PER_DAY)
            : drag.originalStart;
        const newEnd = new Date(drag.originalEnd.getTime() + deltaDays * MS_PER_DAY);
        onReschedule(epic.id, newStart, newEnd);
      }

      draggingRef.current = null;
      setDragging(null);
      setPendingLeft(null);
      setPendingWidth(null);
      setTooltip(null);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, epic.id, onReschedule]);

  function startDrag(e: React.MouseEvent, type: "move" | "resize-end") {
    e.stopPropagation();
    didDragRef.current = false;
    setDragging({
      type,
      startX: e.clientX,
      originalStart: new Date(epic.startDate!),
      originalEnd: new Date(epic.endDate!),
    });
  }

  const displayLeft = pendingLeft ?? left;
  const displayWidth = pendingWidth ?? width;
  const isDragging = dragging !== null;

  const startDateStr = epic.startDate ? formatDate(new Date(epic.startDate).toISOString()) : "—";
  const endDateStr = epic.endDate ? formatDate(new Date(epic.endDate).toISOString()) : "—";

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger
        nativeButton={false}
        render={<div />}
        className={`absolute top-2 bottom-2 rounded overflow-hidden flex items-center text-white text-xs font-medium select-none
          ${isDragging ? "opacity-80 shadow-lg cursor-grabbing" : "cursor-grab hover:brightness-110"}`}
        style={{
          left: `${displayLeft}px`,
          width: `${displayWidth}px`,
          backgroundColor: epic.color,
          minWidth: "40px",
          position: "absolute",
        }}
        title={`${epic.name} · ${done}/${total} done (${donePct}%)`}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).dataset.resizeHandle) return;
          startDrag(e, "move");
        }}
        onClick={(e) => {
          if (didDragRef.current) { e.preventDefault(); return; }
          setPopoverOpen(true);
        }}
        aria-label={`Epic: ${epic.name}`}
        onKeyDown={(e) => { if (e.key === "Enter") setPopoverOpen(true); }}
      >
          {total > 0 && (
            <div
              className="absolute inset-0 opacity-30 bg-black"
              style={{ width: `${100 - donePct}%`, right: 0, left: "auto" }}
            />
          )}
          <span className="relative z-10 truncate px-2">{epic.name}</span>
          <span className="relative z-10 ml-auto opacity-80 shrink-0 pr-5">
            {total > 0 ? `${donePct}%` : `(${total})`}
          </span>
          {/* Resize handle */}
          <div
            data-resize-handle="true"
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 hover:bg-white/30"
            onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "resize-end"); }}
            aria-label="Resize epic end date"
          />
      </PopoverTrigger>

      {/* Drag tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-popover text-popover-foreground border rounded shadow-md text-xs px-2 py-1 pointer-events-none"
          style={{ left: `${displayLeft + 4}px`, top: "auto" }}
        >
          {tooltip}
        </div>
      )}

      <PopoverContent className="w-72 p-4" align="start" side="bottom">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-sm leading-snug">{epic.name}</p>
            <div className="mt-1">
              <EpicStatusBadge status={epic.status ?? "IN_PLANNING"} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Start</span>
            <span>{startDateStr}</span>
            <span className="font-medium text-foreground">End</span>
            <span>{endDateStr}</span>
            <span className="font-medium text-foreground">Tickets</span>
            <span>{done}/{total} done</span>
          </div>
          {total > 0 && (
            <Badge variant="secondary" className="text-xs">
              {donePct}% complete
            </Badge>
          )}
          <Link
            href={`/portfolio/${epic.id}`}
            className="block text-xs text-primary hover:underline font-medium"
            onClick={() => setPopoverOpen(false)}
          >
            Open epic →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
