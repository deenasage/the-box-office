// SPEC: reports.md
// SPEC: design-improvements.md
"use client";

import { useState, useEffect } from "react";
import { BarChart2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportsErrorBoundary } from "@/components/reports/ReportsErrorBoundary";
import { LeadCycleTab } from "@/components/reports/LeadCycleTab";
import { SprintSummaryTab } from "@/components/reports/SprintSummaryTab";
import { ThroughputTab } from "@/components/reports/ThroughputTab";
import { VelocityTab } from "@/components/reports/VelocityTab";
import { TimeAccuracyTab } from "@/components/reports/TimeAccuracyTab";
import { DataSubNav } from "@/components/data/DataSubNav";

export default function ReportsPage() {
  const [sprints, setSprints] = useState<{ id: string; name: string }[]>([]);
  const [sprintsLoaded, setSprintsLoaded] = useState(false);
  const [sprintsError, setSprintsError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sprints")
      .then((r) => r.json())
      .then((res: { data: { id: string; name: string }[] }) => {
        setSprints((res.data ?? []).map((s) => ({ id: s.id, name: s.name })));
        setSprintsLoaded(true);
      })
      .catch((err: unknown) => {
        console.error("[ReportsPage] Failed to fetch sprints", err);
        setSprintsError("Failed to load sprints");
        setSprintsLoaded(true);
      });
  }, []);

  const noSprintsEmpty = sprintsLoaded && !sprintsError && sprints.length === 0;

  return (
    <ReportsErrorBoundary>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Data &amp; Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sprint metrics, lead time, and throughput reports across all teams.
          </p>
        </div>
        <DataSubNav />
        {sprintsError && (
          <p className="text-sm text-destructive">{sprintsError}</p>
        )}
        <Tabs defaultValue="lead-time">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="lead-time">Lead Time</TabsTrigger>
            <TabsTrigger value="cycle-time">Cycle Time</TabsTrigger>
            <TabsTrigger value="sprint-summary">Sprint Summary</TabsTrigger>
            <TabsTrigger value="throughput">Throughput</TabsTrigger>
            <TabsTrigger value="velocity">Velocity</TabsTrigger>
            <TabsTrigger value="time-accuracy">Time Accuracy</TabsTrigger>
          </TabsList>
          <TabsContent value="lead-time" className="pt-4">
            <LeadCycleTab type="lead-time" />
          </TabsContent>
          <TabsContent value="cycle-time" className="pt-4">
            <LeadCycleTab type="cycle-time" />
          </TabsContent>
          <TabsContent value="sprint-summary" className="pt-4">
            {noSprintsEmpty ? (
              <SprintTabEmptyState />
            ) : (
              <SprintSummaryTab sprints={sprints} />
            )}
          </TabsContent>
          <TabsContent value="throughput" className="pt-4">
            <ThroughputTab />
          </TabsContent>
          <TabsContent value="velocity" className="pt-4">
            <VelocityTab />
          </TabsContent>
          <TabsContent value="time-accuracy" className="pt-4">
            {noSprintsEmpty ? (
              <SprintTabEmptyState />
            ) : (
              <TimeAccuracyTab sprints={sprints} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ReportsErrorBoundary>
  );
}

function SprintTabEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-3 mx-auto mb-4 w-fit">
        <BarChart2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium">No sprint data available yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        Create and complete a sprint to see reports here.
      </p>
    </div>
  );
}
