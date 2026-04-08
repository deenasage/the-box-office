// SPEC: capacity-planning.md
// SPEC: skillsets.md
// SPEC: design-improvements.md
"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Team } from "@prisma/client";
import { notify } from "@/lib/toast";
import { SkeletonCard } from "@/components/ui/skeletons";
import { TEAM_BADGE_COLORS, TEAM_LABELS } from "@/lib/constants";
import { CapacityHeatmap } from "@/components/capacity/CapacityHeatmap";
import { SkillsetCapacityPanel } from "@/components/capacity/SkillsetCapacityPanel";
import { MemberTicketsDialog } from "@/components/capacity/MemberTicketsDialog";
import { Check, X, Pencil, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemberRow {
  userId: string;
  name: string;
  capacityPoints: number | null;
  committedPoints: number;
  utilizationPct: number | null;
}

interface TeamData {
  team: Team;
  members: MemberRow[];
  totalCapacity: number;
  totalCommitted: number;
  avgVelocity: number | null;
  utilizationPct: number;
}

interface CapacityData {
  sprintId: string;
  sprintName: string;
  teams: TeamData[];
}

// ── Util helpers ──────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function barColor(pct: number | null) {
  if (pct === null) return "bg-muted-foreground/20";
  if (pct > 100) return "bg-destructive";
  if (pct > 80) return "bg-amber-500";
  return "bg-primary";
}

function utilClass(pct: number | null) {
  if (pct === null) return "text-muted-foreground";
  if (pct > 100) return "text-destructive font-semibold";
  if (pct > 80) return "text-amber-600 dark:text-amber-400 font-semibold";
  return "text-green-600 dark:text-green-400 font-semibold";
}

// ── Per-member row ────────────────────────────────────────────────────────────

function MemberCapacityRow({
  member,
  sprintId,
  onUpdate,
}: {
  member: MemberRow;
  sprintId: string;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [hrs, setHrs] = useState(String(member.capacityPoints ?? ""));
  const [showTickets, setShowTickets] = useState(false);

  async function save() {
    try {
      const res = await fetch(`/api/sprints/${sprintId}/capacity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.userId, points: parseInt(hrs) || 0 }),
      });
      if (res.ok) { notify.success("Capacity updated"); onUpdate(); }
      else notify.error("Failed to update");
    } catch { notify.error("Failed to update"); }
    setEditing(false);
  }

  const cap = member.capacityPoints;
  const committed = member.committedPoints;
  const pct = member.utilizationPct;
  const fillPct = cap != null && cap > 0 ? Math.min(100, Math.round((committed / cap) * 100)) : 0;
  const remaining = cap != null ? cap - committed : null;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
        {/* Avatar */}
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
          {getInitials(member.name)}
        </div>

        {/* Name */}
        <button
          type="button"
          className="w-36 shrink-0 text-sm font-medium text-left truncate hover:text-primary hover:underline transition-colors"
          onClick={() => setShowTickets(true)}
          title={`View ${member.name}'s tickets`}
        >
          {member.name}
        </button>

        {/* Capacity bar */}
        <div className="flex-1 min-w-0">
          {cap != null ? (
            <div className="space-y-0.5">
              <div
                className="w-full bg-muted rounded-full h-4 overflow-hidden cursor-pointer"
                title={`${committed}h committed of ${cap}h available`}
                onClick={() => { if (!editing) { setEditing(true); setHrs(String(cap)); } }}
              >
                <div
                  className={cn("h-4 rounded-full transition-all", barColor(pct))}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="w-full h-4 rounded-full border-2 border-dashed border-border hover:border-primary/50 transition-colors text-[10px] text-muted-foreground flex items-center justify-center"
              onClick={() => setEditing(true)}
            >
              Click to set capacity
            </button>
          )}
        </div>

        {/* Hours label */}
        <div className="w-24 shrink-0 text-right">
          {editing ? (
            <div className="flex items-center gap-1 justify-end">
              <Input
                type="number"
                className="h-6 w-16 text-xs text-right px-1"
                value={hrs}
                onChange={(e) => setHrs(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") save(); else if (e.key === "Escape") setEditing(false); }}
                min="0"
                autoFocus
                placeholder="hours"
              />
              <button onClick={save} className="h-6 w-6 flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 shrink-0" aria-label="Save">
                <Check className="h-3 w-3" />
              </button>
              <button onClick={() => setEditing(false)} className="h-6 w-6 flex items-center justify-center rounded border hover:bg-muted shrink-0" aria-label="Cancel">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground tabular-nums">
              {committed}h{cap != null ? ` / ${cap}h` : ""}
            </span>
          )}
        </div>

        {/* Utilization % */}
        <div className="w-14 shrink-0 text-right">
          {pct != null ? (
            <span className={cn("text-xs tabular-nums", utilClass(pct))}>{pct}%</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Remaining */}
        <div className="w-16 shrink-0 text-right">
          {remaining != null ? (
            <span className={cn("text-xs tabular-nums", remaining < 0 ? "text-destructive" : "text-muted-foreground")}>
              {remaining >= 0 ? `${remaining}h left` : `${Math.abs(remaining)}h over`}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Edit button */}
        {!editing && (
          <button
            type="button"
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={() => { setEditing(true); setHrs(String(cap ?? "")); }}
            aria-label={`Set capacity for ${member.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showTickets && (
        <MemberTicketsDialog
          open={showTickets}
          onClose={() => setShowTickets(false)}
          memberName={member.name}
          memberId={member.userId}
          team={"CONTENT" as Team}
          sprintId={sprintId}
        />
      )}
    </>
  );
}

// ── Team section ──────────────────────────────────────────────────────────────

function TeamSection({
  teamData,
  sprintId,
  onUpdate,
}: {
  teamData: TeamData;
  sprintId: string;
  onUpdate: () => void;
}) {
  if (teamData.members.length === 0) return null;

  const teamPct =
    teamData.totalCapacity > 0
      ? Math.min(100, Math.round((teamData.totalCommitted / teamData.totalCapacity) * 100))
      : 0;
  const teamBarColor =
    teamData.utilizationPct > 100 ? "bg-destructive" :
    teamData.utilizationPct > 80  ? "bg-amber-500" :
    "bg-primary";

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Team header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b">
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded border shrink-0", TEAM_BADGE_COLORS[teamData.team])}>
          {TEAM_LABELS[teamData.team]}
        </span>
        <div className="flex-1 min-w-0">
          {teamData.totalCapacity > 0 ? (
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className={cn("h-2 rounded-full transition-all", teamBarColor)} style={{ width: `${teamPct}%` }} />
            </div>
          ) : (
            <div className="w-full bg-muted rounded-full h-2" />
          )}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-32 text-right">
          {teamData.totalCommitted}h / {teamData.totalCapacity > 0 ? `${teamData.totalCapacity}h` : "—"}
        </span>
        {teamData.utilizationPct > 0 && (
          <span className={cn("text-xs font-medium tabular-nums shrink-0 w-10 text-right", utilClass(teamData.utilizationPct))}>
            {teamData.utilizationPct}%
          </span>
        )}
        {teamData.avgVelocity !== null && (
          <span className="text-xs text-muted-foreground shrink-0">
            avg {teamData.avgVelocity}h/sprint
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b bg-muted/20">
        <div className="w-8 shrink-0" />
        <div className="w-36 shrink-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Member</div>
        <div className="flex-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Load</div>
        <div className="w-24 shrink-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Committed / Cap</div>
        <div className="w-14 shrink-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Util</div>
        <div className="w-16 shrink-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Remaining</div>
        <div className="w-6 shrink-0" />
      </div>

      {/* Member rows */}
      <div className="divide-y">
        {teamData.members.map((m) => (
          <MemberCapacityRow
            key={m.userId}
            member={m}
            sprintId={sprintId}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}

// ── Planning tab ──────────────────────────────────────────────────────────────

function PlanningTab({ teamFilter }: { teamFilter: Team | null }) {
  const [sprints, setSprints] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [sprintId, setSprintId] = useState("");
  const [data, setData] = useState<CapacityData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/sprints")
      .then((r) => r.json())
      .then((res: { data: { id: string; name: string; isActive: boolean }[] }) => {
        const list = res.data ?? [];
        setSprints(list);
        const active = list.find((s) => s.isActive);
        if (active) setSprintId(active.id);
        else if (list[0]) setSprintId(list[0].id);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    if (!sprintId) return;
    setLoadError(false);
    setData(null);
    fetch(`/api/capacity?sprintId=${sprintId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: CapacityData) => setData(d))
      .catch(() => setLoadError(true));
  }, [sprintId, refreshKey]);

  // Apply team filter before rendering
  const visibleTeams = data?.teams.filter(
    (t) => t.members.length > 0 && (!teamFilter || t.team === teamFilter)
  ) ?? [];

  const totalCapacity = visibleTeams.reduce((s, t) => s + t.totalCapacity, 0);
  const totalCommitted = visibleTeams.reduce((s, t) => s + t.totalCommitted, 0);
  const remaining = totalCapacity > 0 ? totalCapacity - totalCommitted : null;
  const overallPct = totalCapacity > 0 ? Math.round((totalCommitted / totalCapacity) * 100) : 0;
  const overallBarColor = overallPct > 100 ? "bg-destructive" : overallPct > 80 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-5">
      {/* Sprint selector + summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={sprintId} onValueChange={(v) => setSprintId(v ?? "")}>
          <SelectTrigger className="w-52 h-9 text-sm shrink-0">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
              {sprintId
                ? (() => { const s = sprints.find((x) => x.id === sprintId); return s ? `${s.name}${s.isActive ? " · Active" : ""}` : sprintId; })()
                : "Select sprint"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}{s.isActive ? " · Active" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data && totalCapacity > 0 && (
          <div className="flex items-center gap-6 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <div className="w-32 bg-muted rounded-full h-2.5 overflow-hidden">
                <div className={cn("h-2.5 rounded-full", overallBarColor)} style={{ width: `${Math.min(100, overallPct)}%` }} />
              </div>
              <span className="text-muted-foreground tabular-nums">{overallPct}% used</span>
            </div>
            <span className="text-muted-foreground">{totalCommitted}h committed</span>
            <span className="text-muted-foreground">{totalCapacity}h capacity</span>
            {remaining !== null && (
              <span className={remaining < 0 ? "text-destructive font-medium" : "text-green-600 dark:text-green-400 font-medium"}>
                {remaining >= 0 ? `${remaining}h remaining` : `${Math.abs(remaining)}h over`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-primary/20" />
          ≤80% On track
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-500/20" />
          81–100% Near capacity
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-destructive/20" />
          &gt;100% Overcommitted
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <Pencil className="h-3 w-3" />
          Hover a row to edit capacity
        </span>
      </div>

      {loadError && (
        <p className="text-sm text-destructive">
          Failed to load capacity data.{" "}
          <button type="button" className="underline hover:no-underline" onClick={() => { setLoadError(false); setRefreshKey((k) => k + 1); }}>
            Retry
          </button>
        </p>
      )}

      {!data && !loadError && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {visibleTeams.map((team) => (
            <TeamSection
              key={team.team}
              teamData={team}
              sprintId={data.sprintId}
              onUpdate={() => setRefreshKey((k) => k + 1)}
            />
          ))}
          {visibleTeams.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">No team members found</p>
              <p className="text-sm text-muted-foreground">Assign users to teams in Admin → Users.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Skillset tab ──────────────────────────────────────────────────────────────

function SkillsetTab() {
  const [sprints, setSprints] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [initialSprintId, setInitialSprintId] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/sprints")
      .then((r) => r.json())
      .then((res: { data: { id: string; name: string; isActive: boolean }[] }) => {
        const list = res.data ?? [];
        setSprints(list);
        const active = list.find((s) => s.isActive);
        setInitialSprintId(active?.id ?? list[0]?.id);
      })
      .catch(console.error);
  }, []);

  return <SkillsetCapacityPanel sprints={sprints} initialSprintId={initialSprintId} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CapacityPageClient({ teamFilter }: { teamFilter: Team | null }) {
  const teamLabel = teamFilter ? (TEAM_LABELS[teamFilter] ?? teamFilter) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {teamLabel ? `${teamLabel} Capacity` : "Capacity Planning"}
      </h1>

      <Tabs defaultValue="planning">
        <TabsList className="mb-4">
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="by-skillset">Design Skillsets</TabsTrigger>
        </TabsList>

        <TabsContent value="planning">
          <PlanningTab teamFilter={teamFilter} />
        </TabsContent>

        <TabsContent value="heatmap">
          <CapacityHeatmap />
        </TabsContent>

        <TabsContent value="by-skillset">
          <SkillsetTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
