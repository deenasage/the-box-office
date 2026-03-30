// SPEC: sprint-scrum.md
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { BurndownPoint } from "@/lib/reports";

// ── Chart row type ─────────────────────────────────────────────────────────────
// BurndownPoint already has the shape we need: { date, ideal, actual? }.
// We re-export the prop type so callers can import it if needed.

export interface BurndownChartProps {
  /** Output of getBurndownData() — one entry per calendar day of the sprint. */
  data: BurndownPoint[];
}

export function BurndownChart({ data }: BurndownChartProps) {
  if (data.length === 0 || data[0].ideal === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sized tickets in this sprint — burndown chart requires estimated
        tickets.
      </p>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  // Show start / mid / end date labels only.
  const labelDates = new Set<string>();
  labelDates.add(data[0].date);
  labelDates.add(data[data.length - 1].date);
  const midIdx = Math.floor(data.length / 2);
  labelDates.add(data[midIdx].date);

  const isTodayInSprint =
    today >= data[0].date && today <= data[data.length - 1].date;

  return (
    <div className="w-full aspect-2/1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        >
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => (labelDates.has(v) ? v.slice(5) : "")}
          />
          <YAxis tick={{ fontSize: 11 }} unit="pts" width={44} />
          <Tooltip
            formatter={(value) => [`${value ?? 0} pts`, ""]}
            labelFormatter={(label) => `Date: ${label ?? ""}`}
          />
          <Legend />

          {isTodayInSprint && (
            <ReferenceLine
              x={today}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{ value: "Today", fontSize: 10, fill: "#94a3b8" }}
            />
          )}

          {/* Ideal burndown — dashed grey, linear from total → 0 */}
          <Line
            type="linear"
            dataKey="ideal"
            name="Ideal"
            stroke="#94a3b8"
            strokeDasharray="4 4"
            dot={false}
            connectNulls={false}
          />

          {/* Actual burndown — driven by TicketStatusHistory DONE transitions */}
          <Line
            type="linear"
            dataKey="actual"
            name="Actual"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
