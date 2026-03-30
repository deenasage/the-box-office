// SPEC: sprints.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Target } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SprintGoalData {
  id: string;
  name: string;
  notes: string | null;
  isActive: boolean;
  startDate: string;
  endDate: string;
  completedHours: number;
  committedHours: number;
}

function getQuarter(dateStr: string): string {
  const date = new Date(dateStr);
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

export function SprintGoalsRollup() {
  const [sprints, setSprints] = useState<SprintGoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/sprints?limit=200")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load sprints");
        return r.json();
      })
      .then((res: { data: SprintGoalData[] }) => {
        setSprints(res.data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [retryKey]);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground text-sm">Loading notes…</div>;
  }

  if (error) {
    return (
      <div className="py-12 text-center text-destructive text-sm">
        {error}
        <button className="ml-2 underline" onClick={() => setRetryKey((k) => k + 1)}>Retry</button>
      </div>
    );
  }

  const withGoals = sprints.filter((s) => s.notes);
  const withoutGoals = sprints.filter((s) => !s.notes);

  if (withGoals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground border rounded-lg">
        <Target className="h-8 w-8 opacity-40" />
        <p className="font-medium text-foreground">No sprint notes yet</p>
        <p className="text-sm">Add notes when creating or editing a sprint to track them here.</p>
      </div>
    );
  }

  // Group by quarter
  const byQuarter: Record<string, SprintGoalData[]> = {};
  for (const sprint of withGoals) {
    const q = getQuarter(sprint.startDate);
    if (!byQuarter[q]) byQuarter[q] = [];
    byQuarter[q].push(sprint);
  }

  // Sort quarters descending
  const quarters = Object.keys(byQuarter).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {quarters.map((quarter) => {
        const qSprints = byQuarter[quarter];
        const achieved = qSprints.filter(
          (s) => !s.isActive && s.completedHours > 0 && s.completedHours >= s.committedHours * 0.8
        ).length;

        return (
          <div key={quarter}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {quarter}
              </h2>
              <span className="text-xs text-muted-foreground">
                {achieved}/{qSprints.length} achieved
              </span>
            </div>
            <div className="grid gap-3">
              {qSprints.map((sprint) => {
                const isAchieved =
                  !sprint.isActive &&
                  sprint.committedHours > 0 &&
                  sprint.completedHours >= sprint.committedHours * 0.8;
                const donePct =
                  sprint.committedHours > 0
                    ? Math.min(100, Math.round((sprint.completedHours / sprint.committedHours) * 100))
                    : 0;

                return (
                  <Card key={sprint.id} className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        {isAchieved ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/40 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <CardTitle className="text-sm font-medium">{sprint.name}</CardTitle>
                            {sprint.isActive && <Badge variant="default" className="text-[11px] h-4">Active</Badge>}
                            {isAchieved && <Badge variant="outline" className="text-[11px] h-4 text-green-600 border-green-300">Achieved</Badge>}
                          </div>
                          <p className="text-sm text-foreground/80 leading-snug">{sprint.notes}</p>
                        </div>
                      </div>
                    </CardHeader>
                    {!sprint.isActive && sprint.committedHours > 0 && (
                      <CardContent className="pt-0 pl-11">
                        <div className="space-y-1">
                          <div className="w-full bg-muted rounded-full h-1">
                            <div
                              className={`h-1 rounded-full transition-all ${isAchieved ? "bg-green-500" : "bg-primary"}`}
                              style={{ width: `${donePct}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {donePct}% complete · {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                          </p>
                        </div>
                      </CardContent>
                    )}
                    {sprint.isActive && (
                      <CardContent className="pt-0 pl-11">
                        <p className="text-[11px] text-muted-foreground">
                          In progress · {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {withoutGoals.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          {withoutGoals.length} sprint{withoutGoals.length !== 1 ? "s" : ""} without notes (not shown)
        </p>
      )}
    </div>
  );
}
