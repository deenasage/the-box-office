// SPEC: sprints.md
// SPEC: design-improvements.md
"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SprintReport as SprintReportType } from "@/types";

interface SprintReportProps {
  sprintId: string;
}

export function SprintReport({ sprintId }: SprintReportProps) {
  const [report, setReport] = useState<SprintReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/sprints/${sprintId}/report`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: SprintReportType) => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [sprintId, refreshKey]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading report…</p>;

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
        <span>Failed to load sprint report.</span>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="ml-auto rounded-sm px-2 py-1 font-medium underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 focus-visible:outline-none"
          aria-label="Retry loading sprint report"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!report) return null;

  const chartData = report.teamBreakdown
    .filter((row) => row.committed > 0 || row.completed > 0)
    .map((row) => ({
      team: row.team,
      Committed: row.committed,
      Completed: row.completed,
    }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Committed</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{report.totalCommitted}h</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Completed</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600 dark:text-green-400">{report.totalCompleted}h</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Completion Rate</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${report.velocity >= 80 ? "text-green-600 dark:text-green-400" : report.velocity >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
              {report.velocity}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Total Tickets</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {report.teamBreakdown.reduce((n, r) => n + r.ticketCount, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis dataKey="team" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Committed" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Completed" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
