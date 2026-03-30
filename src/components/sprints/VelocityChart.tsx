// SPEC: sprint-scrum.md
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

export interface VelocitySprintRow {
  name: string;
  completedHours: number;
  committedHours: number;
}

interface VelocityChartProps {
  sprints: VelocitySprintRow[];
}

export function VelocityChart({ sprints }: VelocityChartProps) {
  if (sprints.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No completed sprints yet. Velocity will appear here once sprints are finished.
      </p>
    );
  }

  const last6 = sprints.slice(-6);
  const avgVelocity =
    last6.length > 0
      ? Math.round(last6.reduce((s, sp) => s + sp.completedHours, 0) / last6.length)
      : 0;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Rolling avg velocity (last {last6.length} sprints):{" "}
        <span className="font-semibold text-foreground">{avgVelocity}h</span>
      </p>
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={last6} barCategoryGap="30%">
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="h" width={40} />
            <Tooltip formatter={(v) => `${v ?? 0}h`} />
            <Legend />
            <ReferenceLine
              y={avgVelocity}
              stroke="#6366f1"
              strokeDasharray="4 4"
              label={{ value: `Avg ${avgVelocity}h`, fontSize: 10, fill: "#6366f1", position: "right" }}
            />
            <Bar dataKey="committedHours" name="Committed" fill="#94a3b8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="completedHours" name="Velocity" fill="#22c55e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
