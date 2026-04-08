// SPEC: board-column-visibility.md
"use client";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { TeamKey, StatusSetting, StatusKey } from "./types";
import { STATUS_LIST, TEAMS } from "./types";

interface Props {
  team: TeamKey;
  settings: StatusSetting[];
  onToggleVisible: (team: TeamKey, status: StatusKey, visible: boolean) => void;
  onChangeWipLimit: (team: TeamKey, status: StatusKey, limit: number | null) => void;
}

export function TeamSettingsCard({ team, settings, onToggleVisible, onChangeWipLimit }: Props) {
  const teamConfig = TEAMS.find((t) => t.key === team)!;

  function getRow(statusKey: StatusKey): StatusSetting | undefined {
    return settings.find((s) => s.team === team && s.status === statusKey);
  }

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={`size-2.5 rounded-full ${teamConfig.color}`} aria-hidden="true" />
          {teamConfig.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm" aria-label={`${teamConfig.label} board settings`}>
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
              <th className="py-2 pl-4 pr-2 text-left font-medium">Status</th>
              <th className="py-2 px-2 text-left font-medium">Visible</th>
              <th className="py-2 pl-2 pr-4 text-left font-medium">WIP Limit</th>
            </tr>
          </thead>
          <tbody>
            {STATUS_LIST.map(({ key, label, color }) => {
              const row = getRow(key);
              const isDone = key === "DONE";
              const visible = row?.visible ?? true;
              const wipLimit = row?.wipLimit ?? null;

              return (
                <tr
                  key={key}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="py-2.5 pl-4 pr-2">
                    <span className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${color}`} aria-hidden="true" />
                      <span className="font-medium">{label}</span>
                    </span>
                  </td>

                  <td className="py-2.5 px-2">
                    <Label className="sr-only" htmlFor={`visible-${team}-${key}`}>
                      {label} visible for {teamConfig.label}
                    </Label>
                    <Switch
                      id={`visible-${team}-${key}`}
                      checked={visible}
                      disabled={isDone}
                      onCheckedChange={(v) => onToggleVisible(team, key, v)}
                    />
                  </td>

                  <td className="py-2 pl-2 pr-4">
                    <Label className="sr-only" htmlFor={`wip-${team}-${key}`}>
                      WIP limit for {label} in {teamConfig.label}
                    </Label>
                    <Input
                      id={`wip-${team}-${key}`}
                      type="number"
                      min={1}
                      placeholder="No limit"
                      className="w-24 h-7 text-sm"
                      value={wipLimit ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChangeWipLimit(
                          team,
                          key,
                          val === "" ? null : Math.max(1, parseInt(val, 10))
                        );
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
