// SPEC: reports.md
"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Team } from "@prisma/client";
import { SkeletonTable } from "@/components/ui/skeletons";
import { ReportStatCards } from "@/components/reports/ReportStatCards";

interface SprintOption {
  id: string;
  name: string;
}

interface TeamRow {
  team: Team;
  entered: number;
  completed: number;
  carriedOver: number;
  committedPoints: number;
  completedPoints: number;
}

interface SprintSummaryData {
  totalEntered: number;
  totalCompleted: number;
  totalCarriedOver: number;
  carryOverRate: number | null;
  committedPoints: number;
  completedPoints: number;
  byTeam: TeamRow[];
}

interface SprintSummaryTabProps {
  sprints: SprintOption[];
}

function carryColor(rate: number): string {
  if (rate < 20) return "text-green-600";
  if (rate < 40) return "text-yellow-600";
  return "text-red-600";
}

export function SprintSummaryTab({ sprints }: SprintSummaryTabProps) {
  const [sprintId, setSprintId] = useState(sprints[0]?.id ?? "");
  const [data, setData] = useState<SprintSummaryData | null>(null);
  const [error, setError] = useState(false);

  function load(id: string) {
    if (!id) return;
    setError(false);
    setData(null);
    fetch(`/api/reports?type=sprint-summary&sprintId=${id}`)
      .then((r) => r.json())
      .then((json: SprintSummaryData & { error?: string }) => {
        if (!json?.error) setData(json);
        else setError(true);
      })
      .catch(() => setError(true));
  }

  useEffect(() => { load(sprintId); }, [sprintId]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
        <p>Failed to load sprint summary.</p>
        <button
          onClick={() => load(sprintId)}
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return <SkeletonTable />;

  return (
    <div className="space-y-4">
      <Select value={sprintId} onValueChange={(v) => setSprintId(v ?? "")}>
        <SelectTrigger className="w-48 h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sprints.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ReportStatCards stats={[
        { label: "Entered Sprint", value: data.totalEntered },
        { label: "Completed",      value: data.totalCompleted },
        { label: "Carried Over",   value: data.totalCarriedOver },
        {
          label: "Carry-over Rate",
          value: data.carryOverRate != null ? `${data.carryOverRate}%` : "—",
          sub: data.carryOverRate != null
            ? `${data.committedPoints}h committed · ${data.completedPoints}h done`
            : "Only shown for completed sprints",
        },
      ]} />
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2">Team</th>
              <th className="text-right px-3 py-2">Entered</th>
              <th className="text-right px-3 py-2">Done</th>
              <th className="text-right px-3 py-2">Carried</th>
              <th className="text-right px-3 py-2">Pts In</th>
              <th className="text-right px-3 py-2">Pts Done</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.byTeam.map((row) => {
              const rowCarryRate = row.entered > 0 ? (row.carriedOver / row.entered) * 100 : 0;
              return (
                <tr key={row.team} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{row.team}</td>
                  <td className="px-3 py-2 text-right">{row.entered}</td>
                  <td className="px-3 py-2 text-right text-green-600">{row.completed}</td>
                  <td className={`px-3 py-2 text-right font-medium ${carryColor(rowCarryRate)}`}>
                    {row.carriedOver}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{row.committedPoints}h</td>
                  <td className="px-3 py-2 text-right">{row.completedPoints}h</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
