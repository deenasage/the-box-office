// SPEC: form-builder.md
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { FormFieldConfig } from "@/types";
import { FieldDialog } from "./FieldDialog";
import type { FieldDialogData } from "./FieldDialog";
import { SortableFieldRow } from "./SortableFieldRow";

interface FormBuilderEditorProps {
  templateId: string;
  initialFields: FormFieldConfig[];
}

// ── Main editor ──────────────────────────────────────────────────────────────

export function FormBuilderEditor({ templateId, initialFields }: FormBuilderEditorProps) {
  const router = useRouter();
  const [fields, setFields] = useState<FormFieldConfig[]>(initialFields);
  const [saving, setSaving] = useState(false);

  // Dialog state — null means closed, "add" or field object means open
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [editingField, setEditingField] = useState<FormFieldConfig | undefined>(undefined);

  const sensors = useSensors(useSensor(PointerSensor));

  // ── Field CRUD ─────────────────────────────────────────────────────────────

  async function handleSave(data: FieldDialogData) {
    setSaving(true);
    if (dialogMode === "add") {
      await addField(data);
    } else if (dialogMode === "edit" && editingField) {
      await updateField(editingField.id, data);
    }
    setSaving(false);
    setDialogMode(null);
    setEditingField(undefined);
  }

  async function addField(data: FieldDialogData) {
    // Task 4d: use max order + 1 to avoid collisions
    const nextOrder =
      fields.length === 0 ? 0 : Math.max(...fields.map((f) => f.order)) + 1;

    const res = await fetch(`/api/form-templates/${templateId}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: data.label,
        fieldKey: data.fieldKey,
        type: data.type,
        required: data.required,
        order: nextOrder,
        options: data.options,
        conditions: data.conditions,
      }),
    });

    if (res.ok) {
      const created = await res.json();
      setFields((prev) => [
        ...prev,
        {
          id: created.id,
          label: data.label,
          fieldKey: data.fieldKey,
          type: data.type,
          required: data.required,
          order: nextOrder,
          options: data.options,
          conditions: data.conditions,
        },
      ]);
      router.refresh();
    }
  }

  async function updateField(fieldId: string, data: FieldDialogData) {
    const res = await fetch(
      `/api/form-templates/${templateId}/fields/${fieldId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: data.label,
          type: data.type,
          required: data.required,
          options: data.options ?? null,
          conditions: data.conditions ?? null,
        }),
      }
    );

    if (res.ok) {
      setFields((prev) =>
        prev.map((f) =>
          f.id === fieldId
            ? {
                ...f,
                label: data.label,
                type: data.type,
                required: data.required,
                options: data.options,
                conditions: data.conditions,
              }
            : f
        )
      );
      router.refresh();
    }
  }

  async function deleteField(fieldId: string) {
    await fetch(`/api/form-templates/${templateId}/fields/${fieldId}`, {
      method: "DELETE",
    });
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
  }

  // ── Drag and drop ──────────────────────────────────────────────────────────

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...fields];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const withNewOrders = reordered.map((f, i) => ({ ...f, order: i }));
    setFields(withNewOrders);

    await fetch(`/api/form-templates/${templateId}/fields/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: withNewOrders.map((f) => ({ id: f.id, order: f.order })),
      }),
    });
  }

  // ── Dialog helpers ─────────────────────────────────────────────────────────

  function openAdd() {
    setEditingField(undefined);
    setDialogMode("add");
  }

  function openEdit(field: FormFieldConfig) {
    setEditingField(field);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingField(undefined);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fields ({fields.length})</h2>
        <Button size="sm" onClick={openAdd} aria-label="Add new field">
          <Plus className="h-4 w-4 mr-1" /> Add Field
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="divide-y border rounded-lg">
            {fields.map((field) => (
              <SortableFieldRow
                key={field.id}
                field={field}
                onEdit={openEdit}
                onDelete={deleteField}
              />
            ))}
            {fields.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No fields yet. Add your first field.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <FieldDialog
        mode={dialogMode ?? "add"}
        open={dialogMode !== null}
        field={editingField}
        allFields={fields}
        saving={saving}
        onSave={handleSave}
        onClose={closeDialog}
      />
    </div>
  );
}
