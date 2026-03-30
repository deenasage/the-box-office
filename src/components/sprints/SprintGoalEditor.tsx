// SPEC: sprints.md
// Scrum Master requirement: Sprint goal must be displayed prominently in the sprint
// detail header and be inline-editable by ADMIN or TEAM_LEAD.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SprintGoalEditorProps {
  sprintId: string;
  goal: string | null;
  canEdit: boolean;
}

export function SprintGoalEditor({ sprintId, goal, canEdit }: SprintGoalEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: draft.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save sprint goal");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(goal ?? "");
    setEditing(false);
    setError(null);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); void handleSave(); }
              if (e.key === "Escape") handleCancel();
            }}
            placeholder="Enter sprint goal statement…"
            maxLength={500}
            className="flex-1 h-8 text-sm rounded-md border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Sprint goal"
            autoFocus
          />
          <Button size="sm" className="h-7 px-2" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span className="sr-only">Save goal</span>
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCancel} disabled={saving}>
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Cancel</span>
          </Button>
        </div>
        {error && <p className="text-xs text-destructive pl-6">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn("group flex items-center gap-2", !goal && canEdit && "opacity-60 hover:opacity-100")}>
      <Target className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
      {goal ? (
        <p className="text-sm font-medium text-foreground/90">{goal}</p>
      ) : canEdit ? (
        <p className="text-sm italic text-muted-foreground">No sprint goal set — click to add one</p>
      ) : (
        <p className="text-sm italic text-muted-foreground">No sprint goal set</p>
      )}
      {canEdit && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setEditing(true)}
          aria-label="Edit sprint goal"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
