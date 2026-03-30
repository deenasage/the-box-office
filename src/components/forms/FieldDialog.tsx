// SPEC: design-improvements.md
// SPEC: form-builder.md
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConditionRuleEditor } from "./ConditionRuleEditor";
import { FieldType } from "@prisma/client";
import type { FormFieldConfig, ConditionalRule } from "@/types";

const FIELD_TYPES = Object.values(FieldType);
const OPTION_TYPES: FieldType[] = [FieldType.SELECT, FieldType.MULTISELECT, FieldType.RADIO];

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Text (single line)",
  TEXTAREA: "Textarea (multi-line)",
  SELECT: "Dropdown (select one)",
  MULTISELECT: "Multi-select (select many)",
  RADIO: "Radio buttons",
  CHECKBOX: "Checkbox",
  DATE: "Date picker",
  NUMBER: "Number",
  EMAIL: "Email",
  URL: "URL",
};

export interface FieldDialogData {
  label: string;
  fieldKey: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  conditions?: ConditionalRule[];
}

interface FieldDialogProps {
  mode: "add" | "edit";
  open: boolean;
  field?: FormFieldConfig;
  allFields: FormFieldConfig[];
  saving: boolean;
  onSave: (data: FieldDialogData) => void;
  onClose: () => void;
}

function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function FieldDialog({
  mode,
  open,
  field,
  allFields,
  saving,
  onSave,
  onClose,
}: FieldDialogProps) {
  const [label, setLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [type, setType] = useState<FieldType>(FieldType.TEXT);
  const [required, setRequired] = useState(false);
  const [optionsRaw, setOptionsRaw] = useState("");
  const [conditions, setConditions] = useState<ConditionalRule[]>([]);

  // Populate from field when editing
  useEffect(() => {
    if (mode === "edit" && field) {
      setLabel(field.label);
      setFieldKey(field.fieldKey);
      setKeyManuallyEdited(true); // don't auto-derive key in edit mode
      setType(field.type);
      setRequired(field.required);
      setOptionsRaw(field.options?.join("\n") ?? "");
      setConditions(field.conditions ?? []);
    } else {
      setLabel("");
      setFieldKey("");
      setKeyManuallyEdited(false);
      setType(FieldType.TEXT);
      setRequired(false);
      setOptionsRaw("");
      setConditions([]);
    }
  }, [mode, field, open]);

  function handleLabelChange(val: string) {
    setLabel(val);
    if (!keyManuallyEdited) {
      setFieldKey(labelToKey(val));
    }
  }

  function handleSave() {
    if (!label.trim()) return;
    const options = OPTION_TYPES.includes(type)
      ? optionsRaw
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;
    onSave({ label, fieldKey, type, required, options, conditions });
  }

  const title = mode === "add" ? "Add Field" : "Edit Field";
  const saveLabel = saving ? "Saving…" : mode === "add" ? "Add Field" : "Save Changes";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="fd-label">Label *</Label>
            <Input
              id="fd-label"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Request Type"
            />
          </div>

          {/* Field Key */}
          <div className="space-y-1.5">
            <Label htmlFor="fd-key">Field Key</Label>
            <Input
              id="fd-key"
              value={fieldKey}
              onChange={(e) => {
                setFieldKey(e.target.value);
                setKeyManuallyEdited(true);
              }}
              placeholder="e.g. request_type"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Stable identifier — do not change after tickets are submitted.
            </p>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Field Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          {OPTION_TYPES.includes(type) && (
            <div className="space-y-1.5">
              <Label>Options (one per line)</Label>
              <textarea
                className="w-full border rounded-md p-2 text-sm min-h-[80px] bg-background"
                value={optionsRaw}
                onChange={(e) => setOptionsRaw(e.target.value)}
                placeholder={"Option A\nOption B\nOption C"}
              />
            </div>
          )}

          {/* Required */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="fd-required"
              checked={required}
              onCheckedChange={(v) => setRequired(!!v)}
            />
            <Label htmlFor="fd-required" className="font-normal">
              Required
            </Label>
          </div>

          {/* Conditions */}
          <ConditionRuleEditor
            rules={conditions}
            onChange={setConditions}
            availableFields={allFields}
            currentFieldKey={fieldKey}
          />

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !label.trim()}
            className="w-full"
          >
            {saveLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
