// SPEC: portfolio-view.md
"use client";

import { useState } from "react";
import { Team } from "@prisma/client";
import type { EpicSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Re-exported for backward compatibility with EpicEditButton and portfolio page.
export type EpicData = EpicSummary;

interface EpicFormDialogProps {
  epic?: EpicData;
  onSaved: (epic: EpicData) => void;
  onClose: () => void;
}

const COLOR_SWATCHES = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f97316",
  "#ef4444",
  "#eab308",
];

const TEAMS: { value: Team; label: string }[] = [
  { value: Team.CONTENT, label: "Content" },
  { value: Team.DESIGN, label: "Design" },
  { value: Team.SEO, label: "SEO" },
  { value: Team.WEM, label: "WEM" },
  { value: Team.PAID_MEDIA, label: "Paid Media" },
  { value: Team.ANALYTICS, label: "Analytics" },
];

const NO_TEAM = "__none__";

function toDateInput(val: string | Date | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toISOString().slice(0, 10);
}

export function EpicFormDialog({ epic, onSaved, onClose }: EpicFormDialogProps) {
  const isEdit = !!epic;

  const [name, setName] = useState(epic?.name ?? "");
  const [color, setColor] = useState(epic?.color ?? "#3b82f6");
  const [startDate, setStartDate] = useState(toDateInput(epic?.startDate));
  const [endDate, setEndDate] = useState(toDateInput(epic?.endDate));
  const [team, setTeam] = useState<Team | null>(epic?.team ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError("End date must be after start date.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = isEdit ? `/api/epics/${epic!.id}` : "/api/epics";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          ...(startDate ? { startDate: new Date(startDate).toISOString() } : { startDate: null }),
          ...(endDate ? { endDate: new Date(endDate).toISOString() } : { endDate: null }),
          team: team ?? null,
        }),
      });

      const json = await res.json() as { data?: EpicData; error?: unknown };

      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Failed to save.");
        return;
      }

      onSaved(json.data!);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Epic" : "New Epic"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="epic-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="epic-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 SEO Initiative"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Select color ${swatch}`}
                  aria-pressed={color === swatch}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform focus-visible:outline-2 focus-visible:outline-ring",
                    color === swatch ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Custom color"
                className="h-7 w-7 cursor-pointer rounded border border-input bg-transparent p-0.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="epic-start">Start Date</Label>
              <input
                id="epic-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="epic-end">End Date</Label>
              <input
                id="epic-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="epic-team">Team (optional)</Label>
            <Select
              value={team ?? NO_TEAM}
              onValueChange={(v) => setTeam(v === NO_TEAM ? null : (v as Team))}
            >
              <SelectTrigger id="epic-team" className="w-full">
                <SelectValue>{team == null ? "No team" : TEAMS.find((t) => t.value === team)?.label ?? "No team"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEAM}>No team</SelectItem>
                {TEAMS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
