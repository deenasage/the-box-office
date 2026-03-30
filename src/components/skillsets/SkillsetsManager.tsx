// SPEC: skillsets.md
// SPEC: design-improvements.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { SkillsetBadge } from "./SkillsetBadge";
import { notify } from "@/lib/toast";
import { Pencil, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillsetRow {
  id: string;
  name: string;
  team: string | null;
  color: string;
  isActive: boolean;
}

interface SkillsetsManagerProps {
  initialSkillsets: SkillsetRow[];
}

const DEFAULT_COLOR = "#7c3aed";

export function SkillsetsManager({ initialSkillsets }: SkillsetsManagerProps) {
  const [skillsets, setSkillsets] = useState<SkillsetRow[]>(initialSkillsets);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);
  const [newTeam, setNewTeam] = useState("DESIGN");
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) { setDialogError("Name is required."); return; }
    setSaving(true); setDialogError(null);
    try {
      const res = await fetch("/api/skillsets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), team: newTeam, color: newColor }),
      });
      const json = await res.json();
      if (!res.ok) { setDialogError(json.error ?? "Failed to create."); return; }
      setSkillsets((prev) => [...prev, json.data as SkillsetRow]);
      notify.success("Skillset created");
      setCreating(false); setNewName(""); setNewColor(DEFAULT_COLOR); setNewTeam("DESIGN");
    } catch { setDialogError("Network error."); }
    finally { setSaving(false); }
  }

  function startEdit(s: SkillsetRow) {
    setEditingId(s.id); setEditName(s.name); setEditColor(s.color);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/skillsets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      const json = await res.json();
      if (!res.ok) { notify.error(json.error ?? "Failed to save."); return; }
      setSkillsets((prev) => prev.map((s) => s.id === id ? { ...s, name: editName.trim(), color: editColor } : s));
      notify.success("Skillset updated"); setEditingId(null);
    } catch { notify.error("Network error."); }
    finally { setSaving(false); }
  }

  async function handleToggleActive(s: SkillsetRow) {
    const res = await fetch(`/api/skillsets/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    if (res.ok) {
      setSkillsets((prev) => prev.map((r) => r.id === s.id ? { ...r, isActive: !s.isActive } : r));
      notify.success(s.isActive ? "Skillset deactivated" : "Skillset activated");
    } else notify.error("Failed to update.");
  }

  async function handleDelete(s: SkillsetRow) {
    if (!window.confirm(`Delete "${s.name}"? This is a soft delete — it will be deactivated and hidden from new tickets.`)) return;
    const res = await fetch(`/api/skillsets/${s.id}`, { method: "DELETE" });
    if (res.status === 204 || res.ok) {
      setSkillsets((prev) => prev.filter((r) => r.id !== s.id));
      notify.success("Skillset deleted");
      return;
    }
    const json = await res.json();
    if (res.status === 409) { notify.error(json.error ?? `Cannot delete — tickets reference this skillset. Deactivate it instead.`); return; }
    notify.error(json?.error ?? "Failed to delete.");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setCreating(true); setDialogError(null); }}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Skillset
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              {/* Color column removed — the badge already conveys color visually */}
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 w-36" />
            </tr>
          </thead>
          <tbody>
            {skillsets.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-foreground">No skillsets yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first skillset using the button above.
                  </p>
                </td>
              </tr>
            )}
            {skillsets.map((s) => (
              <tr key={s.id} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", !s.isActive && "opacity-50")}>
                <td className="px-4 py-3">
                  {editingId === s.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 w-40 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(s.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="h-7 w-8 rounded border cursor-pointer"
                        aria-label="Color picker"
                      />
                      <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleSaveEdit(s.id)} disabled={saving}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-1" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <SkillsetBadge name={s.name} color={s.color} />
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.isActive ? (
                    <Badge variant="outline" className="text-[#008146] border-[#008146]/30 bg-[#008146]/10 text-xs font-medium">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-xs font-medium">
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(s)} aria-label={`Edit ${s.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(s)}
                      aria-label={s.isActive ? `Deactivate ${s.name}` : `Activate ${s.name}`}
                      className="text-xs text-muted-foreground"
                    >
                      {s.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(s)}
                      aria-label={`Delete ${s.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={creating} onOpenChange={(o) => { if (!o) setCreating(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Skillset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-skillset-name">Name <span className="text-destructive">*</span></Label>
              <Input id="new-skillset-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Motion Design" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-skillset-team">Team</Label>
              <Select value={newTeam} onValueChange={(v) => { if (v !== null) setNewTeam(v); }}>
                <SelectTrigger id="new-skillset-team">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTENT">Content</SelectItem>
                  <SelectItem value="DESIGN">Design</SelectItem>
                  <SelectItem value="SEO">SEO</SelectItem>
                  <SelectItem value="WEM">WEM</SelectItem>
                  <SelectItem value="PAID_MEDIA">Paid Media</SelectItem>
                  <SelectItem value="ANALYTICS">Analytics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-skillset-color">Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" id="new-skillset-color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-8 w-12 rounded border cursor-pointer" />
                <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-8 w-28 text-xs font-mono" placeholder="#7c3aed" />
              </div>
            </div>
            {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
