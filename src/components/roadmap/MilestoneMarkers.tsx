// SPEC: roadmap.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useState } from "react";

interface Milestone {
  id: string;
  name: string;
  date: Date;
}

interface MilestoneMarkersProps {
  milestones: Milestone[];
  dateToPercent: (date: Date) => number;
}

export function MilestoneMarkers({ milestones, dateToPercent }: MilestoneMarkersProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (milestones.length === 0) return null;

  return (
    <>
      {/* Header row with "Key Dates" label */}
      <div className="relative h-8 border-b bg-muted/20" aria-label="Key date markers">
        <span className="absolute left-1 top-1 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
          Key Dates
        </span>

        {milestones.map((m) => {
          const pct = dateToPercent(m.date);
          if (pct < 0 || pct > 100) return null;
          const dateLabel = m.date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const isHovered = hoveredId === m.id;

          return (
            <div
              key={m.id}
              className="absolute top-0 bottom-0 flex flex-col items-center group"
              style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
              onMouseEnter={() => setHoveredId(m.id)}
              onMouseLeave={() => setHoveredId(null)}
              role="img"
              aria-label={`Key date: ${m.name} on ${dateLabel}`}
            >
              {/* Diamond marker */}
              <div
                className="mt-1 w-2.5 h-2.5 rotate-45 bg-amber-500 border border-amber-700 shrink-0 transition-transform group-hover:scale-125"
                aria-hidden="true"
              />
              {/* Rotated label — visible by default, hidden on hover in favour of tooltip */}
              {!isHovered && (
                <span
                  className="absolute top-4 text-[11px] text-amber-700 whitespace-nowrap font-medium"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: "none" }}
                >
                  {m.name}
                </span>
              )}
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute top-7 z-40 bg-popover text-popover-foreground border rounded shadow-lg text-xs px-2 py-1.5 whitespace-nowrap pointer-events-none">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-muted-foreground">{dateLabel}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full-height vertical lines — rendered as an absolutely-positioned overlay
          so they extend through all epic rows below the header */}
      <div
        className="absolute inset-0 top-0 pointer-events-none z-10"
        aria-hidden="true"
      >
        {milestones.map((m) => {
          const pct = dateToPercent(m.date);
          if (pct < 0 || pct > 100) return null;
          return (
            <div
              key={`line-${m.id}`}
              className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-amber-400/50"
              style={{ left: `${pct}%` }}
            />
          );
        })}
      </div>
    </>
  );
}

