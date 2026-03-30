// SPEC: roadmap.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RoadmapSpreadsheet } from "./RoadmapSpreadsheet";
import { RoadmapTimeline } from "./RoadmapTimeline";

type User = { id: string; name: string };

export interface SerializedSprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface Props {
  users: User[];
  sprints: SerializedSprint[];
  epics: unknown[];
}

type View = "spreadsheet" | "timeline";

export function RoadmapTabs({ users, sprints }: Props) {
  const [view, setView] = useState<View>("spreadsheet");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={view === "spreadsheet" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("spreadsheet")}
        >
          Spreadsheet
        </Button>
        <Button
          variant={view === "timeline" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("timeline")}
        >
          Timeline
        </Button>
      </div>

      {view === "spreadsheet" ? (
        <RoadmapSpreadsheet users={users} />
      ) : (
        <RoadmapTimeline initialSprints={sprints} />
      )}
    </div>
  );
}
