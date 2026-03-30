// SPEC: form-builder.md
import type { ConditionalRule, FormFieldConfig } from "@/types";

/**
 * Evaluate all conditional rules for a field given the current form values.
 * Returns the effective visibility and required state.
 */
export function evaluateConditions(
  field: FormFieldConfig,
  formValues: Record<string, unknown>
): { visible: boolean; required: boolean } {
  let visible = true;
  let required = field.required;

  if (!field.conditions || field.conditions.length === 0) {
    return { visible, required };
  }

  for (const rule of field.conditions) {
    const match = evaluateRule(rule, formValues);
    if (match) {
      if (rule.action === "show") visible = true;
      if (rule.action === "hide") visible = false;
      if (rule.action === "require") required = true;
    }
  }

  return { visible, required };
}

function evaluateRule(rule: ConditionalRule, values: Record<string, unknown>): boolean {
  const { fieldKey, operator, value } = rule.when;
  const fieldValue = values[fieldKey];
  const strValue = fieldValue != null ? String(fieldValue) : "";

  switch (operator) {
    case "equals":
      return strValue === String(value ?? "");
    case "not_equals":
      return strValue !== String(value ?? "");
    case "contains":
      return strValue.includes(String(value ?? ""));
    case "is_empty":
      return strValue.trim() === "";
    case "is_not_empty":
      return strValue.trim() !== "";
    default:
      return false;
  }
}
