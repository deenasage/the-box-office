// SPEC: reports.md
"use client";

import { useState, useEffect } from "react";
import { Team } from "@prisma/client";
import { TeamFilter } from "@/components/reports/TeamFilter";
import { SkeletonTable } from "@/components/ui/skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { TEAM_LABELS } from "@/lib/constants";

// ─── API types ─────────────────────────────────────────────────────────────────

interface TeamSummaryRow {
  team: Team;
  totalEstimated: number;
  totalActual: number;
  avgVariancePct: number;
  ticketCount: number;
}

interface TicketRow {
  id: string;
  title: string;
  team: Team;
  size: string | null;
  estimated: number;
  actual: number;
  variance: number;
  variancePct: number;
}

interface TimeAccuracyData {
  summary: TeamSummaryRow[];
  tickets: TicketRow[];
}

interface SprintOption {
  id: string;
  name: string;
}

interface TimeAccuracyTabProps {
  sprints: SprintOption[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function varianceColor(pct: number): string {
  const abs = Math.abs(pct);
  if (abs <= 20) return "text-green-600";
  if (abs <= 50) return "text-yellow-600";
  return "text-red-600";
}

function varianceBg(pct: number): string {
  const abs = Math.abs(pct);
  if (abs <= 20) return "bg-green-50";
  if (abs <= 50) return "bg-yellow-50";
  return "bg-red-50";
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TeamSummaryTable({ rows }: { rows: TeamSummaryRow[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">
              Team
            </th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground">
              Estimated
            </th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground">
              Actual
            </th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground">
              Avg Variance
            </th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground">
              Tickets
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.team} className="hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">{TEAM_LABELS[row.team]}</td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                {row.totalEstimated}h
              </td>
              <td className="px-3 py-2 text-right">{row.totalActual}h</td>
              <td
                className={`px-3 py-2 text-right font-medium ${varianceColor(
                  row.avgVariancePct
                )}`}
              >
                {formatPct(row.avgVariancePct)}
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                {row.ticketCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TicketBreakdownProps {
  tickets: TicketRow[];
}

function TicketBreakdown({ tickets }: TicketBreakdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-sm font-medium px-0 hover:bg-transparent"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="ticket-breakdown-table"
      >
        {open ? (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        )}
        Ticket breakdown ({tickets.length})
      </Button>

      {open && (
        <div
          id="ticket-breakdown-table"
          className="mt-2 border rounded-lg overflow-hidden"
        >
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  Ticket
                </th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  Team
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                  Est.
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                  Actual
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                  Variance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className={`hover:bg-muted/30 ${varianceBg(t.variancePct)}`}
                >
                  <td className="px-3 py-2 max-w-[240px]">
                    <span className="block truncate" title={t.title}>
                      {t.title}
                    </span>
                    {t.size && (
                      <span className="text-xs text-muted-foreground">
                        Size {t.size}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {TEAM_LABELS[t.team]}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {t.estimated}h
                  </td>
                  <td className="px-3 py-2 text-right">{t.actual}h</td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${varianceColor(
                      t.variancePct
                    )}`}
                  >
                    {formatPct(t.variancePct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main tab ──────────────────────────────────────────────────────────────────

export function TimeAccuracyTab({ sprints }: TimeAccuracyTabProps) {
  const [team, setTeam] = useState("all");
  const [sprintId, setSprintId] = useState(sprints[0]?.id ?? "");
  const [data, setData] = useState<TimeAccuracyData | null>(null);
  const [status, setStatus] = useState<"loading" | "empty" | "error" | "ready">(
    "loading"
  );

  function load() {
    setStatus("loading");
    setData(null);

    const params = new URLSearchParams();
    if (team !== "all") params.set("team", team);
    if (sprintId) params.set("sprintId", sprintId);

    fetch(`/api/reports/time-accuracy?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("non-ok");
        return r.json();
      })
      .then((json: TimeAccuracyData) => {
        const hasData =
          Array.isArray(json.summary) && json.summary.length > 0;
        setData(json);
        setStatus(hasData ? "ready" : "empty");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, sprintId]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <TeamFilter value={team} onChange={setTeam} />

        {sprints.length > 0 && (
          <Select
            value={sprintId}
            onValueChange={(v) => setSprintId(v ?? "")}
          >
            <SelectTrigger
              className="w-48 h-8 text-sm"
              aria-label="Filter by sprint"
            >
              <SelectValue placeholder="All sprints" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All sprints</SelectItem>
              {sprints.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Body */}
      {status === "loading" && <SkeletonTable />}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
          <p>Failed to load time accuracy data.</p>
          <button
            onClick={load}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Retry
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Clock className="h-10 w-10 opacity-30" aria-hidden="true" />
          <p className="font-medium text-sm">No time data yet</p>
          <p className="text-xs max-w-xs">
            Time accuracy appears once tickets have both estimated and logged
            actual hours. Log time on completed tickets to see this report.
          </p>
        </div>
      )}

      {status === "ready" && data && (
        <>
          <TeamSummaryTable rows={data.summary} />
          {data.tickets.length > 0 && (
            <TicketBreakdown tickets={data.tickets} />
          )}
        </>
      )}
    </div>
  );
}
