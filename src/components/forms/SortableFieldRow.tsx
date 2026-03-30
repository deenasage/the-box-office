// SPEC: form-builder.md
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FormFieldConfig } from "@/types";

export interface SortableFieldRowProps {
  field: FormFieldConfig;
  onEdit: (field: FormFieldConfig) => void;
  onDelete: (id: string) => void;
}

export function SortableFieldRow({ field, onEdit, onDelete }: SortableFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer"
      onClick={() => onEdit(field)}
    >
      {/* Drag handle — stop click propagation so it doesn't open edit modal */}
      <span
        {...attributes}
        {...listeners}
        className="text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Drag to reorder ${field.label}`}
      >
        <GripVertical className="h-4 w-4" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{field.label}</span>
          {field.required && <span className="text-xs text-destructive">*</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="secondary" className="text-xs py-0">
            {field.type}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">{field.fieldKey}</span>
          {field.options && field.options.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {field.options.length} options
            </span>
          )}
          {field.conditions && field.conditions.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {field.conditions.length} condition{field.conditions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
        aria-label={`Delete field ${field.label}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(field.id);
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
