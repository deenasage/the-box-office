// SPEC: form-builder.md
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { ConditionalRule, FormFieldConfig } from "@/types";

interface ConditionRuleEditorProps {
  rules: ConditionalRule[];
  onChange: (rules: ConditionalRule[]) => void;
  /** All fields in the form — the current field will be excluded by fieldKey */
  availableFields: FormFieldConfig[];
  currentFieldKey?: string;
}

const OPERATORS: { value: ConditionalRule["when"]["operator"]; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const ACTIONS: { value: ConditionalRule["action"]; label: string }[] = [
  { value: "show", label: "Show" },
  { value: "hide", label: "Hide" },
];

function emptyRule(): ConditionalRule {
  return {
    action: "show",
    when: { fieldKey: "", operator: "equals", value: "" },
  };
}

export function ConditionRuleEditor({
  rules,
  onChange,
  availableFields,
  currentFieldKey,
}: ConditionRuleEditorProps) {
  const watchableFields = currentFieldKey
    ? availableFields.filter((f) => f.fieldKey !== currentFieldKey)
    : availableFields;
  function addRule() {
    onChange([...rules, emptyRule()]);
  }

  function removeRule(index: number) {
    onChange(rules.filter((_, i) => i !== index));
  }

  function updateRule(index: number, patch: Partial<ConditionalRule>) {
    onChange(
      rules.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  function updateWhen(
    index: number,
    patch: Partial<ConditionalRule["when"]>
  ) {
    const rule = rules[index];
    updateRule(index, { when: { ...rule.when, ...patch } });
  }

  const valueRequired = (op: ConditionalRule["when"]["operator"]) =>
    op !== "is_empty" && op !== "is_not_empty";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Conditional Rules</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRule}>
          + Add Rule
        </Button>
      </div>

      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No rules — this field is always visible.
        </p>
      )}

      {rules.map((rule, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-muted/30"
        >
          {/* Action */}
          <Select
            value={rule.action}
            onValueChange={(v) =>
              updateRule(i, { action: v as ConditionalRule["action"] })
            }
          >
            <SelectTrigger className="w-20 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">when</span>

          {/* Watched field */}
          <Select
            value={rule.when.fieldKey ?? ""}
            onValueChange={(v) => updateWhen(i, { fieldKey: v ?? undefined })}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="select field" />
            </SelectTrigger>
            <SelectContent>
              {watchableFields.map((f) => (
                <SelectItem key={f.fieldKey} value={f.fieldKey}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operator */}
          <Select
            value={rule.when.operator}
            onValueChange={(v) =>
              updateWhen(i, {
                operator: v as ConditionalRule["when"]["operator"],
              })
            }
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Value (hidden for is_empty / is_not_empty) */}
          {valueRequired(rule.when.operator) && (
            <Input
              className="h-8 text-xs w-32"
              value={typeof rule.when.value === "string" ? rule.when.value : ""}
              onChange={(e) => updateWhen(i, { value: e.target.value })}
              placeholder="value"
            />
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive ml-auto"
            onClick={() => removeRule(i)}
            aria-label={`Remove condition rule ${i + 1}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {rules.length > 1 && (
        <p className="text-xs text-muted-foreground">
          All rules must match for this field to be affected.
        </p>
      )}
    </div>
  );
}
