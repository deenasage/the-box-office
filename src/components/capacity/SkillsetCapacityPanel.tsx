// SPEC: skillsets.md
// SPEC: design-improvements.md
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillsetBadge } from "@/components/skillsets/SkillsetBadge";
import { SkeletonCard } from "@/components/ui/skeletons";
import { AlertTriangle } from "lucide-react";

interface MemberCapacity {
  userId: string;
  name: string;
  capacityPoints: number | null;
  committedPoints: number;
  utilizationPct: number | null;
}

interface SkillsetRow {
  skillsetId: string;
  skillsetName: string;
  color: string;
  members: MemberCapacity[];
  totalCapacityPoints: number;
  totalCommittedPoints: number;
  loadPct: number | null;
  ticketCount: number;
}

interface SkillsetCapacityData {
  sprintId: string;
  sprintName: string;
  skillsets: SkillsetRow[];
  membersWithNoSkillset: { userId: string; name: string }[];
}

function UtilBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground text-xs">—</span>;
  // Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
  const color =
    pct > 100
      ? "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20"
      : pct > 80
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20"
      : "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20";
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${color}`}>
      {pct}%
    </span>
  );
}

function LoadBar({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  // Brand green for healthy load — matches the load bar in TeamCard on the capacity page.
  const color =
    pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-[#008146]";
  return (
    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Load: ${pct}%`}
      />
    </div>
  );
}

interface Props {
  sprints: { id: string; name: string; isActive: boolean }[];
  initialSprintId?: string;
}

export function SkillsetCapacityPanel({ sprints, initialSprintId }: Props) {
  const [sprintId, setSprintId] = useState(initialSprintId ?? "");
  const [data, setData] = useState<SkillsetCapacityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSprintId) {
      setSprintId((prev) => prev || initialSprintId);
    }
  }, [initialSprintId]);

  useEffect(() => {
    if (!sprintId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/capacity/skillsets?sprintId=${sprintId}&team=DESIGN`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res: SkillsetCapacityData) => setData(res))
      .catch(() => setError("Failed to load skillset capacity data."))
      .finally(() => setLoading(false));
  }, [sprintId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Capacity breakdown by skillset for the <span className="font-medium text-foreground">Design</span> team in the selected sprint.
        </p>
        <Select value={sprintId} onValueChange={(v) => v && setSprintId(v)}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="Select sprint" />
          </SelectTrigger>
          <SelectContent>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}{s.isActive ? " (active)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && data && data.skillsets.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-foreground">No skillsets configured</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add Design team skillsets on the{" "}
            <a href="/admin/skillsets" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Skillsets admin page
            </a>
            .
          </p>
        </div>
      )}

      {!loading && data && data.skillsets.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.skillsets.map((s) => (
              <Card key={s.skillsetId}>
                <CardHeader className="pb-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <SkillsetBadge name={s.skillsetName} color={s.color} />
                    <span className="text-xs text-muted-foreground">
                      {s.ticketCount} ticket{s.ticketCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{s.totalCommittedPoints}pts committed</span>
                      <span>{s.totalCapacityPoints}pts capacity</span>
                    </div>
                    <LoadBar pct={s.loadPct} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {s.members.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No members with this skillset.
                    </p>
                  ) : (
                    <div className="divide-y text-sm">
                      {s.members.map((m) => (
                        <div key={m.userId} className="flex items-center gap-2 py-1.5">
                          <span className="flex-1 truncate text-xs">{m.name}</span>
                          <span className="text-xs text-muted-foreground w-14 text-right">
                            {m.committedPoints}pts
                          </span>
                          <span className="text-xs text-muted-foreground w-14 text-right">
                            {m.capacityPoints !== null ? `/${m.capacityPoints}pts` : "—"}
                          </span>
                          <UtilBadge pct={m.utilizationPct} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Double-count footnote per spec */}
          <p className="text-xs text-muted-foreground">
            * A member with multiple skillsets appears in each relevant skillset row.
            Total committed points across cards may exceed the team total.
          </p>

          {data.membersWithNoSkillset.length > 0 && (
            <div
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              role="alert"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
              <span>
                <span className="font-medium">Members with no skillset assigned: </span>
                {data.membersWithNoSkillset.map((m) => m.name).join(", ")}.{" "}
                Assign skillsets via the user admin page.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
