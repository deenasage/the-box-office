// SPEC: brief-to-epic-workflow.md
"use client";

import { useEffect, useState } from "react";
import { Team } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GanttItem, PRESET_COLORS, TEAM_OPTIONS } from "./gantt-types";

interface GanttItemDialogProps {
  open: boolean;
  /** null = "add new"; partial with id = "edit" */
  item: Partial<GanttItem> | null;
  epicId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function GanttItemDialog({ open, item, epicId, onClose, onSaved }: GanttItemDialogProps) {
  const isEdit = Boolean(item?.id);
  const [title, setTitle] = useState(item?.title ?? "");
  const [team, setTeam] = useState<Team | "none">(item?.team ?? "none");
  const [startDate, setStartDate] = useState(item?.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(item?.endDate?.slice(0, 10) ?? "");
  const [color, setColor] = useState(item?.color ?? PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTitle(item?.title ?? "");
    setTeam(item?.team ?? "none");
    setStartDate(item?.startDate?.slice(0, 10) ?? "");
    setEndDate(item?.endDate?.slice(0, 10) ?? "");
    setColor(item?.color ?? PRESET_COLORS[0]);
    setConfirmDelete(false);
  }, [item]);

  async function handleSave() {
    if (!title.trim() || !startDate || !endDate) return;
    setSaving(true);
    const body = {
      title: title.trim(),
      team: team === "none" ? null : team,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      color,
    };
    try {
      const url = isEdit && item?.id
        ? `/api/epics/${epicId}/gantt/${item.id}`
        : `/api/epics/${epicId}/gantt`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let serverMsg = "";
        try { serverMsg = ((await res.json()) as { error?: string }).error ?? ""; } catch { /* ignore */ }
        notify.error(serverMsg || (isEdit ? "Failed to update Gantt item" : "Failed to create Gantt item"));
        return;
      }
      onSaved();
    } catch {
      notify.error(isEdit ? "Failed to update Gantt item" : "Failed to create Gantt item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/epics/${epicId}/gantt/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error("Failed to delete Gantt item");
        return;
      }
      onSaved();
    } catch {
      notify.error("Failed to delete Gantt item");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = title.trim().length > 0 && startDate !== "" && endDate !== "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Gantt Item" : "Add Gantt Item"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="gantt-title">Title</Label>
            <Input
              id="gantt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design phase"
              maxLength={80}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gantt-team">Team</Label>
            <Select value={team} onValueChange={(v) => setTeam(v as Team | "none")}>
              <SelectTrigger id="gantt-team">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {TEAM_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="gantt-start">Start Date</Label>
              <Input id="gantt-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gantt-end">End Date</Label>
              <Input id="gantt-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 items-center flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Select color ${c}`}
                  className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                  style={{ backgroundColor: c, borderColor: color === c ? "#1e293b" : "transparent" }}
                  onClick={() => setColor(c)}
                />
              ))}
              <input
                type="color"
                aria-label="Custom color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {isEdit && (
            <div className="flex items-center gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-xs text-destructive">Are you sure?</span>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>Delete</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !canSubmit}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
