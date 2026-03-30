// SPEC: roadmap.md
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { dateToPercent } from "@/lib/timeline";
import type { RoadmapPayload, RoadmapEpic } from "@/types";
import { SkeletonCard } from "@/components/ui/skeletons";
import { EpicRow } from "./EpicRow";
import { SprintMarker } from "./SprintMarker";
import { TimelineGrid } from "./TimelineGrid";
import { RoadmapFilters, TEAM_DISPLAY, type ZoomLevel } from "./RoadmapFilters";
import { MilestoneMarkers } from "./MilestoneMarkers";
import { CalendarDays } from "lucide-react";
import type { SerializedSprint } from "./RoadmapTabs";

function groupEpicsByTeam(epics: RoadmapEpic[]): Record<string, RoadmapEpic[]> {
  const groups: Record<string, RoadmapEpic[]> = {};
  for (const epic of epics) {
    const key = epic.team ? (TEAM_DISPLAY[epic.team] ?? epic.team) : "No Team";
    if (!groups[key]) groups[key] = [];
    groups[key].push(epic);
  }
  return groups;
}

interface ApiMilestone {
  id: string;
  name: string;
  date: string;
}

interface MilestoneForMarkers {
  id: string;
  name: string;
  date: Date;
}

interface RoadmapTimelineProps {
  initialSprints?: SerializedSprint[];
}

export function RoadmapTimeline({ initialSprints = [] }: RoadmapTimelineProps) {
  const router = useRouter();
  const [data, setData] = useState<RoadmapPayload | null>(null);
  const [milestones, setMilestones] = useState<MilestoneForMarkers[]>([]);
  const [teamFilter, setTeamFilter] = useState("");
  const [groupByTeam, setGroupByTeam] = useState(false);
  const [zoom, setZoom] = useState<ZoomLevel>("quarter");
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    fetch("/api/milestones")
      .then((r) => r.json())
      .then((res: { data: ApiMilestone[] }) => {
        if (res.data) {
          setMilestones(
            res.data.map((m) => ({ id: m.id, name: m.name, date: new Date(m.date) }))
          );
        }
      });
  }, []);

  useEffect(() => {
    const qs = teamFilter ? `?team=${teamFilter}` : "";
    fetch(`/api/roadmap${qs}`)
      .then((r) => r.json())
      .then((d: RoadmapPayload) => setData(d));
  }, [teamFilter]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleReschedule = useCallback(
    async (epicId: string, startDate: Date, endDate: Date) => {
      const res = await fetch(`/api/epics/${epicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });
      if (!res.ok) {
        notify.error("Failed to reschedule epic. Please try again.");
        return;
      }
      router.refresh();
      const qs = teamFilter ? `?team=${teamFilter}` : "";
      fetch(`/api/roadmap${qs}`)
        .then((r) => r.json())
        .then((d: RoadmapPayload) => setData(d));
    },
    [router, teamFilter]
  );

  // Show an early empty state when the server confirmed there are no sprints yet,
  // before the client-side /api/roadmap fetch completes.
  if (!data && initialSprints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-3 mx-auto mb-4 w-fit">
          <CalendarDays className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium">No sprints yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create a sprint to see it here.
        </p>
      </div>
    );
  }

  if (!data)
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );

  // Show empty state when API confirms no sprints exist.
  if (data.sprints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-3 mx-auto mb-4 w-fit">
          <CalendarDays className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium">No sprints yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create a sprint to see it here.
        </p>
      </div>
    );
  }

  const timelineStart = new Date();
  timelineStart.setDate(1);
  const timelineEnd = new Date(timelineStart);
  if (zoom === "week") {
    timelineEnd.setDate(timelineEnd.getDate() + 7);
  } else if (zoom === "month") {
    timelineEnd.setMonth(timelineEnd.getMonth() + 1);
  } else {
    // quarter — default: 3 months
    timelineEnd.setMonth(timelineEnd.getMonth() + 3);
  }

  const toPercent = (d: Date) => dateToPercent(d, timelineStart, timelineEnd);

  const grouped = groupByTeam
    ? groupEpicsByTeam(data.epics)
    : { All: data.epics };

  return (
    <div className="space-y-3">
      <RoadmapFilters
        teamFilter={teamFilter}
        onTeamChange={setTeamFilter}
        groupByTeam={groupByTeam}
        onGroupByTeamChange={setGroupByTeam}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      {/* Timeline container */}
      <div className="relative border rounded-lg overflow-hidden" ref={containerRef}>
        <TimelineGrid timelineStart={timelineStart} timelineEnd={timelineEnd} />

        <SprintMarker
          sprints={data.sprints}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
        />

        <MilestoneMarkers
          milestones={milestones}
          dateToPercent={toPercent}
        />

        {/* Epic rows */}
        <div className="relative divide-y">
          {data.epics.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No epics found. Create epics to see them on the roadmap.
            </p>
          )}

          {Object.entries(grouped).map(([groupLabel, epics]) => (
            <div key={groupLabel}>
              {groupByTeam && (
                <div className="sticky left-0 px-3 py-1 bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {groupLabel}
                </div>
              )}
              {epics.map((epic) => (
                <EpicRow
                  key={epic.id}
                  epic={epic}
                  timelineStart={timelineStart}
                  timelineEnd={timelineEnd}
                  containerWidth={containerWidth}
                  onReschedule={handleReschedule}
                />
              ))}
              {groupByTeam && epics.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2 italic">
                  No epics
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
