// SPEC: roadmap.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface MilestoneData {
  id: string;
  name: string;
  date: string; // ISO string
  description: string | null;
  color: string;
}

interface MilestoneDialogProps {
  milestone?: MilestoneData;
  onSaved: (milestone: MilestoneData) => void;
  onClose: () => void;
}

function toDateInput(isoString: string | null | undefined): string {
  if (!isoString) return "";
  return new Date(isoString).toISOString().slice(0, 10);
}

export function MilestoneDialog({ milestone, onSaved, onClose }: MilestoneDialogProps) {
  const isEdit = !!milestone;

  const [name, setName] = useState(milestone?.name ?? "");
  const [date, setDate] = useState(toDateInput(milestone?.date));
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [color, setColor] = useState(milestone?.color ?? "#6366f1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = isEdit ? `/api/milestones/${milestone!.id}` : "/api/milestones";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          date: new Date(date).toISOString(),
          description: description.trim() || null,
          color,
        }),
      });

      const json = (await res.json()) as { data?: MilestoneData; error?: unknown };

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
          <DialogTitle>{isEdit ? "Edit Key Date" : "Add Key Date"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="milestone-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="milestone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q2 Launch"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="milestone-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="milestone-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="milestone-description">Description</Label>
            <Textarea
              id="milestone-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this key date"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="milestone-color">Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="milestone-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Choose key date color"
                className="h-8 w-14 cursor-pointer rounded border border-input bg-transparent p-0.5"
              />
              <span className="text-sm text-muted-foreground font-mono">{color}</span>
              <span
                className="h-5 w-5 rounded-full border border-border"
                style={{ backgroundColor: color }}
                aria-hidden
              />
            </div>
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
