// SPEC: roadmap.md
"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EpicFormDialog, type EpicData } from "./EpicFormDialog";
import { EpicStatusBadge } from "@/components/portfolio/EpicStatusBadge";
import { TEAM_LABELS } from "@/lib/constants";

interface EpicRow extends EpicData {
  status: string;
  ticketCount: number;
}

interface EpicAdminTableProps {
  initialEpics: EpicRow[];
}

function formatDate(val: string | Date | null | undefined): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── EpicTableRow ─────────────────────────────────────────────────────────────

interface EpicTableRowProps {
  epic: EpicRow;
  confirmDeleteId: string | null;
  deletingId: string | null;
  onEdit: (epic: EpicRow) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onDelete: (id: string) => void;
}

function EpicTableRow({
  epic,
  confirmDeleteId,
  deletingId,
  onEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: EpicTableRowProps) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: epic.color }}
            aria-hidden
          />
          <span className="font-medium">{epic.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {epic.team
          ? (TEAM_LABELS[epic.team] ?? epic.team)
          : <span className="italic opacity-50">—</span>}
      </td>
      <td className="px-4 py-3">
        <EpicStatusBadge status={epic.status} />
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {formatDate(epic.startDate)}
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {formatDate(epic.endDate)}
      </td>
      <td className="px-4 py-3 text-muted-foreground tabular-nums">
        {epic.ticketCount}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end items-center gap-1">
          {confirmDeleteId === epic.id ? (
            <>
              <span className="text-xs text-destructive mr-1">Delete?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(epic.id)}
                disabled={deletingId === epic.id}
              >
                {deletingId === epic.id ? "Deleting…" : "Yes"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelDelete}
                disabled={deletingId === epic.id}
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
                onClick={() => onEdit(epic)}
                aria-label={`Edit ${epic.name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onConfirmDelete(epic.id)}
                aria-label={`Delete ${epic.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── EpicAdminTable ────────────────────────────────────────────────────────────

export function EpicAdminTable({ initialEpics }: EpicAdminTableProps) {
  const [epics, setEpics] = useState<EpicRow[]>(initialEpics);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EpicRow | undefined>(undefined);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function handleSaved(saved: EpicData) {
    setEpics((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved };
        return next;
      }
      return [...prev, { ...saved, status: "INTAKE", ticketCount: 0 }];
    });
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/epics/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setEpics((prev) => prev.filter((e) => e.id !== id));
        setConfirmDeleteId(null);
      } else {
        const json = (await res.json()) as { error?: string };
        setDeleteError(typeof json.error === "string" ? json.error : "Delete failed.");
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Epic
        </Button>
      </div>

      {deleteError && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {deleteError}
        </p>
      )}

      {epics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No epics yet. Create one to group related tickets on the roadmap.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Team</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Start Date</th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">End Date</th>
                <th className="px-4 py-3 text-left font-medium">Tickets</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {epics.map((epic) => (
                <EpicTableRow
                  key={epic.id}
                  epic={epic}
                  confirmDeleteId={confirmDeleteId}
                  deletingId={deletingId}
                  onEdit={(e) => { setEditing(e); setDialogOpen(true); }}
                  onConfirmDelete={(id) => { setConfirmDeleteId(id); setDeleteError(null); }}
                  onCancelDelete={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <EpicFormDialog
          epic={editing}
          onSaved={handleSaved}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
