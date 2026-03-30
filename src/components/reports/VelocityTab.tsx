// SPEC: reports.md
// SPEC: design-improvements.md
"use client";

import { useState, useEffect } from "react";
import { VelocityChart, type VelocitySprintRow } from "@/components/sprints/VelocityChart";
import { SkeletonTable } from "@/components/ui/skeletons";
import { TrendingUp } from "lucide-react";

export function VelocityTab() {
  const [sprints, setSprints] = useState<VelocitySprintRow[] | null>(null);

  useEffect(() => {
    // Fetch last 6 completed (non-active) sprints with their committed/completed hours
    fetch("/api/reports?type=velocity")
      .then((r) => r.json())
      .then((json: { sprints?: VelocitySprintRow[] }) => {
        if (json?.sprints) setSprints(json.sprints);
        else setSprints([]);
      })
      .catch(() => setSprints([]));
  }, []);

  if (sprints === null) return <SkeletonTable rows={3} />;

  if (sprints.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <TrendingUp className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">No velocity data yet</p>
          <p className="text-xs text-muted-foreground">
            Complete at least one sprint to see velocity trends here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Velocity = hours completed (DONE tickets) per sprint. Committed = total hours in sprint regardless of outcome.
      </p>
      <VelocityChart sprints={sprints} />
    </div>
  );
}
