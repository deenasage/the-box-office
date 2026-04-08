// SPEC: custom-fields.md
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { notify } from "@/lib/toast";
import {
  DndContext, closestCenter,
  PointerSensor, KeyboardSensor,
  useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { FieldRow } from "./custom-fields/FieldRow";
import { FieldFormDialog } from "./custom-fields/FieldFormDialog";
import { FieldsEmptyState } from "./custom-fields/FieldsEmptyState";
import type { CustomField, CustomFieldDraft } from "./custom-fields/types";

interface Props { fields: CustomField[] }

export function CustomFieldsClient({ fields: initialFields }: Props) {
  const [fields, setFields] = useState<CustomField[]>(
    [...initialFields].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const openAdd = useCallback(() => { setEditingField(null); setDialogOpen(true); }, []);
  const openEdit = useCallback((f: CustomField) => { setEditingField(f); setDialogOpen(true); }, []);

  async function handleSave(draft: CustomFieldDraft, id?: string) {
    try {
      const res = await fetch(
        id ? `/api/admin/custom-fields/${id}` : "/api/admin/custom-fields",
        { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }
      );
      if (!res.ok) throw new Error(await res.text());
      const { data: saved } = await res.json() as { data: CustomField };
      setFields((prev) => id ? prev.map((f) => (f.id === id ? saved : f)) : [...prev, saved]);
      notify.success(id ? "Field updated" : "Field created");
      setDialogOpen(false);
    } catch { notify.error("Failed to save field"); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/custom-fields/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setFields((prev) => prev.filter((f) => f.id !== id));
      notify.success("Field deleted");
    } catch { notify.error("Failed to delete field"); }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIdx = fields.findIndex((f) => f.id === activeId);
    const newIdx = fields.findIndex((f) => f.id === overId);
    if (oldIdx === -1 || newIdx === -1) return;
    const previous = fields;
    const reordered = arrayMove(fields, oldIdx, newIdx);
    setFields(reordered);
    try {
      const res = await fetch("/api/admin/custom-fields/reorder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((f) => f.id) }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch { notify.error("Failed to save order"); setFields(previous); }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Custom Fields</h1>
          <p className="mt-1 text-sm text-muted-foreground">Define extra fields that appear on intake forms.</p>
        </div>
        <Button onClick={openAdd}><PlusIcon className="size-4" />Add Field</Button>
      </div>

      {fields.length === 0 ? (
        <FieldsEmptyState onAdd={openAdd} />
      ) : (
        <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden bg-card">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <table className="w-full text-sm" aria-label="Custom fields">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="w-8 pl-3 py-2" aria-label="Reorder" />
                    <th className="py-2 pr-4 text-left font-medium">Name</th>
                    <th className="py-2 pr-4 text-left font-medium">Type</th>
                    <th className="py-2 pr-4 text-left font-medium">Scope</th>
                    <th className="py-2 pr-4 text-left font-medium">Required</th>
                    <th className="py-2 pr-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <FieldRow key={field.id} field={field} onEdit={openEdit} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <FieldFormDialog
        open={dialogOpen}
        field={editingField}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
