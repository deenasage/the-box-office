// SPEC: roadmap.md
"use client";

import { Team } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const TEAM_DISPLAY: Record<string, string> = {
  CONTENT: "Content",
  DESIGN: "Design",
  SEO: "SEO",
  WEM: "WEM",
  PAID_MEDIA: "Paid Media",
  ANALYTICS: "Analytics",
};

const TEAM_OPTIONS = [
  { value: "", label: "All Teams" },
  ...Object.values(Team).map((t) => ({ value: t, label: TEAM_DISPLAY[t] ?? t })),
];

export type ZoomLevel = "week" | "month" | "quarter";

const ZOOM_OPTIONS: { value: ZoomLevel; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
];

interface RoadmapFiltersProps {
  teamFilter: string | null;
  onTeamChange: (team: string) => void;
  groupByTeam: boolean;
  onGroupByTeamChange: (value: boolean) => void;
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
}

export function RoadmapFilters({
  teamFilter,
  onTeamChange,
  groupByTeam,
  onGroupByTeamChange,
  zoom,
  onZoomChange,
}: RoadmapFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select
        value={teamFilter ?? ""}
        onValueChange={(v) => onTeamChange(v === "_all" ? "" : (v ?? ""))}
      >
        <SelectTrigger className="w-40 h-8 text-sm">
          <SelectValue placeholder="All Teams">
            {teamFilter
              ? (TEAM_DISPLAY[teamFilter] ?? teamFilter)
              : "All Teams"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TEAM_OPTIONS.map((o) => (
            <SelectItem
              key={o.value === "" ? "_all" : o.value}
              value={o.value === "" ? "_all" : o.value}
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={groupByTeam ? "default" : "outline"}
        size="sm"
        className="h-8 text-xs"
        onClick={() => onGroupByTeamChange(!groupByTeam)}
        aria-pressed={groupByTeam}
      >
        Group by team
      </Button>

      {/* Zoom controls */}
      <div
        className="flex items-center rounded-md border border-border overflow-hidden"
        role="group"
        aria-label="Timeline zoom"
      >
        {ZOOM_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onZoomChange(opt.value)}
            aria-pressed={zoom === opt.value}
            className={`h-8 px-3 text-xs font-medium transition-colors border-r last:border-r-0 border-border
              ${zoom === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
