// SPEC: roadmap.md
"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MilestoneDialog,
  type MilestoneData,
} from "@/components/milestones/MilestoneDialog";
import { HolidayReference } from "@/components/milestones/HolidayReference";

interface MilestonesClientProps {
  initialMilestones: MilestoneData[];
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MilestonesClient({ initialMilestones }: MilestonesClientProps) {
  const [milestones, setMilestones] = useState<MilestoneData[]>(initialMilestones);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MilestoneData | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(milestone: MilestoneData) {
    setEditing(milestone);
    setDialogOpen(true);
  }

  function handleSaved(saved: MilestoneData) {
    setMilestones((prev) => {
      const idx = prev.findIndex((m) => m.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        // Keep sorted by date asc
        return next.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
      return [...prev, saved].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/milestones/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setMilestones((prev) => prev.filter((m) => m.id !== id));
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Key Date
        </Button>
      </div>

      {milestones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No key dates yet. Add one to mark important dates on the roadmap.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Color</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(m.date)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {m.description ?? <span className="italic opacity-50">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded-full border border-border shrink-0"
                        style={{ backgroundColor: m.color }}
                        aria-hidden
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        {m.color}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end items-center gap-1">
                      {confirmDeleteId === m.id ? (
                        <>
                          <span className="text-xs text-destructive mr-1">Delete?</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(m.id)}
                            disabled={deletingId === m.id}
                          >
                            {deletingId === m.id ? "Deleting…" : "Yes"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={deletingId === m.id}
                          >
                            No
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(m)}
                            aria-label={`Edit ${m.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setConfirmDeleteId(m.id)}
                            aria-label={`Delete ${m.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <MilestoneDialog
          milestone={editing}
          onSaved={handleSaved}
          onClose={() => setDialogOpen(false)}
        />
      )}

      <HolidayReference onMilestoneAdded={handleSaved} />
    </>
  );
}
