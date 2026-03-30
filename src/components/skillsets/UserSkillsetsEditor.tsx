// SPEC: skillsets.md
// SPEC: design-improvements.md
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillsetBadge } from "./SkillsetBadge";
import { notify } from "@/lib/toast";

interface Skillset {
  id: string;
  name: string;
  color: string;
}

interface UserSkillsetsEditorProps {
  userId: string;
  userTeam: string;
  initialSkillsets: Skillset[];
  /** When false, renders read-only chips with no add/remove controls */
  readonly?: boolean;
}

const ADD_SENTINEL = "__add__";

/**
 * Shown in the admin user edit dialog for DESIGN team members.
 * Renders current skillsets as removable chips + a dropdown to add more.
 * Calls PUT /api/users/[id]/skillsets (full-replace) on every change.
 */
export function UserSkillsetsEditor({
  userId,
  userTeam,
  initialSkillsets,
  readonly = false,
}: UserSkillsetsEditorProps) {
  const [allSkillsets, setAllSkillsets] = useState<Skillset[]>([]);
  const [current, setCurrent] = useState<Skillset[]>(initialSkillsets);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userTeam !== "DESIGN") return;
    fetch("/api/skillsets?team=DESIGN&isActive=true")
      .then((r) => r.json())
      .then((res: { data: Skillset[] }) => setAllSkillsets(res.data ?? []))
      .catch(() => {/* silent — dropdown will be empty */});
  }, [userTeam]);

  if (userTeam !== "DESIGN") return null;

  async function persist(next: Skillset[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/skillsets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillsetIds: next.map((s) => s.id) }),
      });
      if (!res.ok) throw new Error("Failed to save");
      notify.success("Skillsets updated");
    } catch {
      notify.error("Failed to save skillsets");
    } finally {
      setSaving(false);
    }
  }

  function handleAdd(id: string | null) {
    if (id === ADD_SENTINEL) return;
    const skillset = allSkillsets.find((s) => s.id === id);
    if (!skillset || current.some((s) => s.id === id)) return;
    const next = [...current, skillset];
    setCurrent(next);
    persist(next);
  }

  function handleRemove(id: string) {
    const next = current.filter((s) => s.id !== id);
    setCurrent(next);
    persist(next);
  }

  const available = allSkillsets.filter(
    (s) => !current.some((c) => c.id === s.id)
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Skillsets</p>

      {current.length === 0 ? (
        // Empty state — matches the pattern used in capacity and sprint panels
        <p className="text-xs text-muted-foreground py-1">
          No skillsets assigned.
        </p>
      ) : (
        // Chip list — remove button is tucked inside the badge row so each chip reads as one unit
        <div className="flex flex-wrap gap-1.5" aria-label="Assigned skillsets">
          {current.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-0.5 rounded-md border pl-0 pr-0.5 py-0"
              style={{
                backgroundColor: `${s.color}26`,
                borderColor: `${s.color}66`,
              }}
            >
              <SkillsetBadge
                name={s.name}
                color={s.color}
                // Border and bg are on the wrapper above — suppress them on the inner badge
                className="border-0 bg-transparent rounded-none px-1.5"
              />
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleRemove(s.id)}
                  disabled={saving}
                  className="flex items-center justify-center rounded-sm p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={`Remove ${s.name}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!readonly && available.length > 0 && (
        // Wider trigger so long skillset names don't truncate; full-width within the form column
        <Select value={ADD_SENTINEL} onValueChange={handleAdd} disabled={saving}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Add skillset…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ADD_SENTINEL} disabled>Add skillset…</SelectItem>
            {available.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {saving && (
        <p className="text-xs text-muted-foreground animate-pulse" aria-live="polite">
          Saving…
        </p>
      )}
    </div>
  );
}
