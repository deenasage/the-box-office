// SPEC: design-improvements.md
// SPEC: reports.md
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Team } from "@prisma/client";
import { TEAM_LABELS } from "@/lib/constants";

const TEAMS = Object.values(Team);

interface TeamFilterProps {
  value: string;
  onChange: (v: string) => void;
}

export function TeamFilter({ value, onChange }: TeamFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "all")}>
      <SelectTrigger className="w-36 h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All teams</SelectItem>
        {TEAMS.map((t) => (
          <SelectItem key={t} value={t}>{TEAM_LABELS[t]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
