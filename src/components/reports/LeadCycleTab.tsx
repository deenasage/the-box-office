// SPEC: reports.md
// SPEC: design-improvements.md
"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Team } from "@prisma/client";
import { SkeletonTable } from "@/components/ui/skeletons";
import { TeamFilter } from "@/components/reports/TeamFilter";
import { ReportStatCards } from "@/components/reports/ReportStatCards";
import { BarChart2 } from "lucide-react";

interface TeamRow {
  team: Team;
  avg: number;
  median: number;
  p75: number;
  count: number;
}

interface LeadCycleData {
  overall: Record<string, number>;
  byTeam: TeamRow[];
}

interface LeadCycleTabProps {
  type: "lead-time" | "cycle-time";
}

export function LeadCycleTab({ type }: LeadCycleTabProps) {
  const [team, setTeam] = useState("all");
  const [data, setData] = useState<LeadCycleData | null>(null);
  const [status, setStatus] = useState<"loading" | "empty" | "ready">("loading");

  useEffect(() => {
    setData(null);
    setStatus("loading");
    const q = team !== "all" ? `&team=${team}` : "";
    fetch(`/api/reports?type=${type}${q}`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.overall && Array.isArray(json?.byTeam)) {
          setData(json);
          setStatus(json.overall.count === 0 ? "empty" : "ready");
        } else {
          setStatus("empty");
        }
      })
      .catch(() => setStatus("empty"));
  }, [type, team]);

  if (status === "loading") return <SkeletonTable />;
  if (status === "empty" || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <BarChart2 className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">No data yet</p>
          <p className="text-xs text-muted-foreground">
            Status history is recorded going forward. Move some tickets through the workflow to see metrics here.
          </p>
        </div>
      </div>
    );
  }

  const label = type === "lead-time" ? "Lead Time" : "Cycle Time";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TeamFilter value={team} onChange={setTeam} />
        <p className="text-xs text-muted-foreground">Business days</p>
      </div>
      <ReportStatCards stats={[
        { label: `Avg ${label}`, value: `${data.overall.avg}d` },
        { label: "Median",       value: `${data.overall.median}d` },
        { label: "P75",          value: `${data.overall.p75}d` },
        { label: "P95",          value: `${data.overall.p95}d`, sub: `${data.overall.count} tickets` },
      ]} />
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.byTeam.filter((r) => r.count > 0)}>
            <XAxis dataKey="team" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="d" />
            <Tooltip formatter={(v) => `${v} days`} />
            <Bar
              dataKey="avg"
              name={`Avg ${label}`}
              radius={[3, 3, 0, 0]}
              fill="#6366f1"
              label={{ position: "top", fontSize: 11, formatter: (v: unknown) => `${v}d` }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2">Team</th>
              <th className="text-right px-3 py-2">Avg</th>
              <th className="text-right px-3 py-2">Median</th>
              <th className="text-right px-3 py-2">P75</th>
              <th className="text-right px-3 py-2">Tickets</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.byTeam.map((row) => (
              <tr key={row.team} className="hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{row.team}</td>
                <td className="px-3 py-2 text-right">{row.avg}d</td>
                <td className="px-3 py-2 text-right">{row.median}d</td>
                <td className="px-3 py-2 text-right">{row.p75}d</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
