// SPEC: labels.md
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LabelEditRow } from "./LabelEditRow";
import { LabelChip } from "./LabelChip";
import { notify } from "@/lib/toast";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";

interface Label {
  id: string;
  name: string;
  color: string;
  _count?: { tickets: number };
}

interface LabelsManagerProps {
  initialLabels: Label[];
}

export function LabelsManager({ initialLabels }: LabelsManagerProps) {
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(name: string, color: string) {
    setAdding(false);
    startTransition(async () => {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (res.ok) {
        const created = (await res.json()) as Label;
        setLabels((prev) =>
          [...prev, { ...created, _count: { tickets: 0 } }].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
        notify.success(`Label "${name}" created`);
      } else {
        const json = (await res.json()) as { error?: string };
        notify.error(json.error ?? "Failed to create label");
      }
    });
  }

  function handleEdit(id: string, name: string, color: string) {
    setEditingId(null);
    startTransition(async () => {
      const res = await fetch(`/api/labels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Label;
        setLabels((prev) =>
          prev
            .map((l) =>
              l.id === id ? { ...updated, _count: l._count } : l
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        notify.success("Label updated");
      } else {
        const json = (await res.json()) as { error?: string };
        notify.error(json.error ?? "Failed to update label");
      }
    });
  }

  function handleDeleteClick(label: Label) {
    const ticketCount = label._count?.tickets ?? 0;
    if (ticketCount > 0 && confirmDeleteId !== label.id) {
      // First click on a label that has tickets: show inline confirmation
      setConfirmDeleteId(label.id);
      return;
    }
    if (confirmDeleteId !== label.id) {
      setConfirmDeleteId(label.id);
      return;
    }
    // Confirmed — proceed with delete
    setConfirmDeleteId(null);
    startTransition(async () => {
      const res = await fetch(`/api/labels/${label.id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setLabels((prev) => prev.filter((l) => l.id !== label.id));
        notify.success("Label deleted");
      } else {
        const json = (await res.json()).catch(() => ({})) as { error?: string };
        notify.error(json.error ?? "Failed to delete label");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
          disabled={adding}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Label
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">
                Tickets
              </th>
              <th className="px-4 py-3 w-36" />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <LabelEditRow
                onSave={handleAdd}
                onCancel={() => setAdding(false)}
              />
            )}
            {labels.length === 0 && !adding && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-10 text-center text-muted-foreground text-sm"
                >
                  No labels yet. Click &ldquo;New Label&rdquo; to create one.
                </td>
              </tr>
            )}
            {labels.map((label) =>
              editingId === label.id ? (
                <LabelEditRow
                  key={label.id}
                  label={label}
                  onSave={(name, color) => handleEdit(label.id, name, color)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <tr
                  key={label.id}
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                >
                  {/* Name + badge preview */}
                  <td className="px-4 py-3">
                    <LabelChip label={label} />
                  </td>

                  {/* Ticket count */}
                  <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                    {label._count?.tickets ?? 0}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {confirmDeleteId === label.id ? (
                        <>
                          <span className="text-xs text-destructive mr-1">
                            {label._count?.tickets
                              ? `Remove from ${label._count.tickets} ticket${label._count.tickets !== 1 ? "s" : ""}?`
                              : "Delete?"}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(label)}
                            disabled={isPending}
                            aria-label="Confirm delete"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setConfirmDeleteId(null)}
                            aria-label="Cancel delete"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingId(label.id);
                              setAdding(false);
                              setConfirmDeleteId(null);
                            }}
                            disabled={isPending}
                            aria-label={`Edit label ${label.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteClick(label)}
                            disabled={isPending}
                            aria-label={`Delete label ${label.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
