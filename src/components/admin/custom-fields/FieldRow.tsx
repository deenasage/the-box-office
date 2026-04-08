// SPEC: custom-fields.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { FieldTypeBadge } from "./FieldTypeBadge";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CustomField } from "./types";

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL:  "Global",
  CONTENT: "Content",
  DESIGN:  "Design",
  SEO:     "SEO",
  WEM:     "WEM",
};

interface Props {
  field: CustomField;
  onEdit: (field: CustomField) => void;
  onDelete: (id: string) => Promise<void>;
}

export function FieldRow({ field, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(field.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
    >
      {/* Drag handle */}
      <td className="w-8 pl-3 py-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
      </td>

      {/* Name */}
      <td className="py-3 pr-4 text-sm font-medium">{field.name}</td>

      {/* Type */}
      <td className="py-3 pr-4">
        <FieldTypeBadge type={field.fieldType} />
      </td>

      {/* Scope */}
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {field.teamScope ? (SCOPE_LABELS[field.teamScope] ?? field.teamScope) : "Global"}
      </td>

      {/* Required */}
      <td className="py-3 pr-4 text-sm">
        {field.required ? (
          <span className="text-xs font-medium text-foreground">Required</span>
        ) : (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 pr-3 text-right">
        {confirming ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs text-destructive mr-1">Delete?</span>
            <Button
              size="xs"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Confirm delete"
            >
              {deleting ? "…" : "Yes"}
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setConfirming(false)}
              aria-label="Cancel delete"
            >
              No
            </Button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onEdit(field)}
              aria-label={`Edit ${field.name}`}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${field.name}`}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </span>
        )}
      </td>
    </tr>
  );
}
