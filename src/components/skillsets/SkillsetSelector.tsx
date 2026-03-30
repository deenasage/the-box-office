// SPEC: skillsets.md
// SPEC: design-improvements.md
"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Skillset {
  id: string;
  name: string;
  color: string;
}

interface SkillsetSelectorProps {
  /** Current required skillset id, or null for "None" */
  value: string | null;
  onChange: (id: string | null) => void;
  /** Only renders when team === "DESIGN" */
  team: string;
  disabled?: boolean;
}

const NONE_SENTINEL = "__none__";

/**
 * Dropdown for picking a required skillset on a ticket.
 * Only visible when team === "DESIGN".
 * Fetches active DESIGN skillsets from /api/skillsets?team=DESIGN&isActive=true.
 */
export function SkillsetSelector({
  value,
  onChange,
  team,
  disabled = false,
}: SkillsetSelectorProps) {
  const [skillsets, setSkillsets] = useState<Skillset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (team !== "DESIGN") return;
    setLoading(true);
    fetch("/api/skillsets?team=DESIGN&isActive=true")
      .then((r) => r.json())
      .then((res: { data: Skillset[] }) => setSkillsets(res.data ?? []))
      .catch(() => setSkillsets([]))
      .finally(() => setLoading(false));
  }, [team]);

  if (team !== "DESIGN") return null;

  function handleChange(v: string | null) {
    onChange(v === NONE_SENTINEL ? null : v);
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        Required Skillset
      </label>
      <Select
        value={value ?? NONE_SENTINEL}
        onValueChange={handleChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className="h-8 w-full text-sm" aria-label="Required skillset">
          <SelectValue placeholder="None">
            {loading
              ? "Loading…"
              : value === null
              ? "None"
              : (skillsets.find((s) => s.id === value)?.name ?? "None")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_SENTINEL}>None</SelectItem>
          {skillsets.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
