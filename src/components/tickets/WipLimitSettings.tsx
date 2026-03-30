// SPEC: tickets.md
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Team, TicketStatus } from "@prisma/client";
import { notify } from "@/lib/toast";
import { STATUS_LABELS, TEAM_LABELS } from "@/lib/constants";

interface KanbanConfig {
  id: string;
  team: Team;
  status: TicketStatus;
  wipLimit: number | null;
}

interface WipLimitSettingsProps {
  open: boolean;
  onClose: () => void;
  /** Pre-filter to a single team. When null, shows all teams. */
  filterTeam?: Team | null;
}

const ALL_TEAMS = Object.values(Team);
const ALL_STATUSES = Object.values(TicketStatus);

type DraftMap = Record<string, string>; // key: `${team}-${status}` → string input

function key(team: Team, status: TicketStatus) {
  return `${team}-${status}`;
}

export function WipLimitSettings({ open, onClose, filterTeam }: WipLimitSettingsProps) {
  const [configs, setConfigs] = useState<KanbanConfig[]>([]);
  const [draft, setDraft] = useState<DraftMap>({});
  const [saving, setSaving] = useState(false);

  const teamsToShow = filterTeam ? [filterTeam] : ALL_TEAMS;

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/kanban-config");
      if (!res.ok) return;
      const data = await res.json() as KanbanConfig[];
      setConfigs(data);
      // Seed draft from loaded configs
      const initial: DraftMap = {};
      for (const cfg of data) {
        initial[key(cfg.team, cfg.status)] = cfg.wipLimit != null ? String(cfg.wipLimit) : "";
      }
      setDraft(initial);
    } catch {
      // silently fail — WIP limits are optional
    }
  }, []);

  useEffect(() => {
    if (open) loadConfigs();
  }, [open, loadConfigs]);

  function handleChange(team: Team, status: TicketStatus, value: string) {
    setDraft((prev) => ({ ...prev, [key(team, status)]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const mutations: Promise<Response>[] = [];
      for (const team of teamsToShow) {
        for (const status of ALL_STATUSES) {
          const k = key(team, status);
          const rawVal = draft[k] ?? "";
          const wipLimit = rawVal === "" ? null : parseInt(rawVal, 10);
          if (!Number.isNaN(wipLimit) || wipLimit === null) {
            mutations.push(
              fetch("/api/kanban-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ team, status, wipLimit }),
              })
            );
          }
        }
      }
      const results = await Promise.all(mutations);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        notify.error("Some WIP limits could not be saved");
      } else {
        notify.success("WIP limits saved");
        onClose();
      }
    } catch {
      notify.error("Failed to save WIP limits");
    } finally {
      setSaving(false);
    }
  }

  function getCurrentWipLimit(team: Team, status: TicketStatus): number | null {
    const cfg = configs.find((c) => c.team === team && c.status === status);
    return cfg?.wipLimit ?? null;
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configure WIP Limits</SheetTitle>
          <SheetDescription>
            Set a maximum number of tickets allowed per column per team. Leave blank for no limit.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {teamsToShow.map((team) => (
            <div key={team}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {TEAM_LABELS[team]}
              </h3>
              <div className="border rounded-lg divide-y">
                {ALL_STATUSES.map((status) => {
                  const k = key(team, status);
                  const currentLimit = getCurrentWipLimit(team, status);
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between gap-4 px-3 py-2"
                    >
                      <span className="text-sm w-28 shrink-0">{STATUS_LABELS[status]}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="number"
                          min={1}
                          value={draft[k] ?? (currentLimit != null ? String(currentLimit) : "")}
                          onChange={(e) => handleChange(team, status, e.target.value)}
                          placeholder="No limit"
                          className="h-8 w-24 text-sm"
                        />
                        {currentLimit != null && (
                          <span className="text-xs text-muted-foreground">
                            current: {currentLimit}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save WIP Limits"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
