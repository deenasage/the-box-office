// SPEC: board-column-visibility.md
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { notify } from "@/lib/toast";
import { TeamSettingsCard } from "./board-settings/TeamSettingsCard";
import { TEAMS, STATUS_LIST } from "./board-settings/types";
import type { BoardSettings, TeamKey, StatusKey, StatusSetting } from "./board-settings/types";
import { LayoutGrid } from "lucide-react";

const DEBOUNCE_MS = 800;

function buildDefault(): BoardSettings {
  const settings: BoardSettings = [];
  for (const team of TEAMS) {
    for (const status of STATUS_LIST) {
      settings.push({
        team: team.key,
        status: status.key,
        visible: true,
        wipLimit: null,
      });
    }
  }
  return settings;
}

export function BoardSettingsClient() {
  const [settings, setSettings] = useState<BoardSettings>(buildDefault());
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/admin/board-settings")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: BoardSettings) => {
        if (Array.isArray(data) && data.length > 0) setSettings(data);
      })
      .catch(() => notify.error("Failed to load board settings"))
      .finally(() => setLoading(false));
  }, []);

  const persistSettings = useCallback((next: BoardSettings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/board-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error(await res.text());
        setSavedAt(Date.now());
      } catch {
        notify.error("Failed to save board settings");
      }
    }, DEBOUNCE_MS);
  }, []);

  function updateRow(
    team: TeamKey,
    status: StatusKey,
    patch: Partial<Pick<StatusSetting, "visible" | "wipLimit">>
  ) {
    setSettings((prev) => {
      const next = prev.map((s) =>
        s.team === team && s.status === status ? { ...s, ...patch } : s
      );
      // Ensure every combination exists
      const has = next.some((s) => s.team === team && s.status === status);
      if (!has) {
        next.push({ team, status, visible: true, wipLimit: null, ...patch });
      }
      persistSettings(next);
      return next;
    });
  }

  function handleToggleVisible(team: TeamKey, status: StatusKey, visible: boolean) {
    updateRow(team, status, { visible });
  }

  function handleChangeWipLimit(team: TeamKey, status: StatusKey, limit: number | null) {
    updateRow(team, status, { wipLimit: limit });
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <LayoutGrid className="size-6 text-muted-foreground" aria-hidden="true" />
            Board Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control which columns are visible and set WIP limits per team. Changes save automatically.
          </p>
        </div>
        {savedAt !== null && (
          <span
            className="mt-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md"
            role="status"
            aria-live="polite"
          >
            Saved
          </span>
        )}
      </div>

      {/* One card per team */}
      <div className="grid gap-6">
        {TEAMS.map(({ key }) => (
          <TeamSettingsCard
            key={key}
            team={key}
            settings={settings}
            onToggleVisible={handleToggleVisible}
            onChangeWipLimit={handleChangeWipLimit}
          />
        ))}
      </div>
    </div>
  );
}
