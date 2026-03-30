// SPEC: reports.md
"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Team } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/ui/skeletons";
import { TeamFilter } from "@/components/reports/TeamFilter";
import { TEAM_CHART_COLORS } from "@/lib/constants";

const TEAMS = Object.values(Team);

interface SprintThroughput {
  sprintId: string;
  sprintName: string;
  completed: number;
  byTeam: { team: Team; completed: number }[];
}

interface ThroughputData {
  bySprint: SprintThroughput[];
}

export function ThroughputTab() {
  const [team, setTeam] = useState("all");
  const [data, setData] = useState<ThroughputData | null>(null);
  const [error, setError] = useState(false);

  function load(teamValue: string) {
    setError(false);
    setData(null);
    const q = teamValue !== "all" ? `&team=${teamValue}` : "";
    fetch(`/api/reports?type=throughput${q}`)
      .then((r) => r.json())
      .then((json: ThroughputData) => { if (json?.bySprint) setData(json); else setError(true); })
      .catch(() => setError(true));
  }

  useEffect(() => { load(team); }, [team]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
        <p>Failed to load throughput data.</p>
        <button
          onClick={() => load(team)}
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return <SkeletonTable />;

  const chartData = data.bySprint.map((s) => {
    const row: Record<string, unknown> = { name: s.sprintName };
    s.byTeam.forEach((t) => { row[t.team] = t.completed; });
    return row;
  });

  const avg = data.bySprint.length > 0
    ? Math.round(data.bySprint.reduce((s, sp) => s + sp.completed, 0) / data.bySprint.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TeamFilter value={team} onChange={setTeam} />
        <Badge variant="outline">Avg: {avg} tickets/sprint</Badge>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {TEAMS.map((t) => (
              <Bar
                key={t}
                dataKey={t}
                stackId="a"
                fill={TEAM_CHART_COLORS[t]}
                radius={t === "WEM" ? [3, 3, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
