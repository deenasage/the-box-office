// SPEC: sprint-scrum.md
// SPEC: design-improvements.md
"use client";

import { Team, TicketSize, TicketStatus } from "@prisma/client";
import { TEAM_LABELS, TEAM_BADGE_COLORS, STATUS_LABELS } from "@/lib/constants";
import { DataSubNav } from "@/components/data/DataSubNav";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TeamCount {
  team: Team;
  count: number;
}

export interface StatusCount {
  status: TicketStatus;
  count: number;
}

export interface WeekBucket {
  weekLabel: string; // e.g. "Jan 6"
  count: number;
}

export interface SprintThroughput {
  sprintName: string;
  doneCount: number;
  totalCount: number;
}

export interface SizeDistribution {
  size: TicketSize;
  count: number;
  pct: number;
}

export interface AnalyticsData {
  ticketsByTeam: TeamCount[];
  ticketsByStatus: StatusCount[];
  weeklyCreation: WeekBucket[];
  throughputBySprint: SprintThroughput[];
  sizeDistribution: SizeDistribution[];
  totalTickets: number;
}

// ── Status colors ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-slate-400",
  TODO: "bg-blue-500",
  IN_PROGRESS: "bg-violet-500",
  IN_REVIEW: "bg-amber-500",
  BLOCKED: "bg-red-500",
  DONE: "bg-[#008146]",
};

const SIZE_COLORS: Record<TicketSize, string> = {
  XS: "bg-slate-300",
  S: "bg-sky-400",
  M: "bg-violet-400",
  L: "bg-amber-400",
  XL: "bg-orange-500",
  XXL: "bg-red-500",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Tickets by Team — horizontal bar chart ─────────────────────────────────────

function TeamBarChart({ data }: { data: TeamCount[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map(({ team, count }) => (
        <div key={team} className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium w-24 justify-center shrink-0 ${TEAM_BADGE_COLORS[team]}`}
          >
            {TEAM_LABELS[team]}
          </span>
          <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
            <div
              className="h-5 rounded-full transition-all bg-primary/80"
              style={{ width: `${Math.round((count / max) * 100)}%` }}
            />
          </div>
          <span className="text-sm font-semibold tabular-nums w-8 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Tickets by Status — stat card row ─────────────────────────────────────────

function StatusCards({ data }: { data: StatusCount[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {data.map(({ status, count }) => (
        <div key={status} className="rounded-lg border bg-card px-3 py-2.5 text-center space-y-1">
          <div className={`w-2 h-2 rounded-full mx-auto ${STATUS_COLORS[status]}`} />
          <p className="text-[11px] text-muted-foreground leading-tight">{STATUS_LABELS[status] ?? status}</p>
          <p className="text-xl font-bold tabular-nums">{count}</p>
        </div>
      ))}
    </div>
  );
}

// ── Weekly Ticket Creation — sparkline bars ────────────────────────────────────

function WeeklySparkline({ data }: { data: WeekBucket[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((week, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full flex items-end justify-center" style={{ height: "48px" }}>
            <div
              className="w-full rounded-t bg-primary/70 transition-all"
              style={{ height: `${Math.max(2, Math.round((week.count / max) * 48))}px` }}
              title={`${week.weekLabel}: ${week.count}`}
            />
          </div>
          {i % 4 === 0 && (
            <span className="text-[9px] text-muted-foreground whitespace-nowrap">
              {week.weekLabel}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Throughput by Sprint — bar chart ──────────────────────────────────────────

function ThroughputBars({ data }: { data: SprintThroughput[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No completed sprints yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.doneCount), 1);
  return (
    <div className="space-y-2">
      {data.map((sprint, i) => {
        const pct = Math.round((sprint.doneCount / max) * 100);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground truncate w-32 shrink-0" title={sprint.sprintName}>
              {sprint.sprintName}
            </span>
            <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
              <div
                className="h-4 rounded-full bg-[#008146]/80 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums w-8 text-right">{sprint.doneCount}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Size Distribution — colored segment row ────────────────────────────────────

function SizeDistributionBar({ data }: { data: SizeDistribution[] }) {
  const sizes: TicketSize[] = ["XS", "S", "M", "L", "XL", "XXL"];
  return (
    <div className="space-y-3">
      <div className="flex h-5 rounded-full overflow-hidden gap-px">
        {sizes.map((size) => {
          const entry = data.find((d) => d.size === size);
          const pct = entry?.pct ?? 0;
          if (pct === 0) return null;
          return (
            <div
              key={size}
              className={`${SIZE_COLORS[size]} h-full transition-all`}
              style={{ width: `${pct}%` }}
              title={`${size}: ${pct}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {sizes.map((size) => {
          const entry = data.find((d) => d.size === size);
          if (!entry || entry.count === 0) return null;
          return (
            <div key={size} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${SIZE_COLORS[size]}`} />
              <span className="text-xs text-muted-foreground">
                {size}: <span className="font-medium text-foreground">{entry.count}</span>
                <span className="text-[11px]"> ({entry.pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Client Component ──────────────────────────────────────────────────────

export function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const doneCount = data.ticketsByStatus.find((s) => s.status === "DONE")?.count ?? 0;
  const inProgressCount = data.ticketsByStatus.find((s) => s.status === "IN_PROGRESS")?.count ?? 0;
  const teamCount = data.ticketsByTeam.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data &amp; Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ticket volume, throughput, and size distribution across all teams.
        </p>
      </div>
      <DataSubNav />

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Tickets" value={data.totalTickets} />
        <StatCard label="Done" value={doneCount} sub={data.totalTickets > 0 ? `${Math.round((doneCount / data.totalTickets) * 100)}% of total` : undefined} />
        <StatCard label="In Progress" value={inProgressCount} />
        <StatCard label="Active Teams" value={teamCount} />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tickets by Team */}
        <div className="rounded-xl border bg-card p-4">
          <SectionHeader title="Tickets by Team" subtitle="Total tickets assigned to each team" />
          {data.ticketsByTeam.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet.</p>
          ) : (
            <TeamBarChart data={data.ticketsByTeam} />
          )}
        </div>

        {/* Weekly Ticket Creation */}
        <div className="rounded-xl border bg-card p-4">
          <SectionHeader title="Weekly Ticket Creation" subtitle="Tickets created over the last 12 weeks" />
          {data.weeklyCreation.every((w) => w.count === 0) ? (
            <p className="text-sm text-muted-foreground">No tickets created in the last 12 weeks.</p>
          ) : (
            <WeeklySparkline data={data.weeklyCreation} />
          )}
        </div>
      </div>

      {/* Tickets by Status */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader title="Tickets by Status" subtitle="Current distribution across workflow stages" />
        <StatusCards data={data.ticketsByStatus} />
      </div>

      {/* Throughput by Sprint */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader
          title="Throughput by Sprint"
          subtitle="Tickets with status DONE at the time of the sprint (last 6 completed sprints)"
        />
        <ThroughputBars data={data.throughputBySprint} />
      </div>

      {/* Size Distribution */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader
          title="Size Distribution"
          subtitle="Breakdown of sized tickets by T-shirt size (unsized tickets excluded)"
        />
        {data.sizeDistribution.every((d) => d.count === 0) ? (
          <p className="text-sm text-muted-foreground">No sized tickets yet.</p>
        ) : (
          <SizeDistributionBar data={data.sizeDistribution} />
        )}
      </div>
    </div>
  );
}
