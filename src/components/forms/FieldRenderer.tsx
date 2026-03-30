// SPEC: form-builder.md
"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldType } from "@prisma/client";
import type { FormFieldConfig } from "@/types";

interface FieldRendererProps {
  field: FormFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
  readOnly?: boolean;
  error?: string;
}

export function FieldRenderer({ field, value, onChange, required, readOnly, error }: FieldRendererProps) {
  const id = `field-${field.fieldKey}`;

  return (
    <div id={id} className="space-y-1.5">
      <Label htmlFor={id}>
        {field.label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <FieldInput
        field={field}
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        readOnly={readOnly}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function FieldInput({
  field,
  id,
  value,
  onChange,
  required,
  readOnly,
}: {
  field: FormFieldConfig;
  id: string;
  value: unknown;
  onChange: (v: unknown) => void;
  required?: boolean;
  readOnly?: boolean;
}) {
  const strValue = value != null ? String(value) : "";

  switch (field.type) {
    case FieldType.TEXT:
    case FieldType.EMAIL:
    case FieldType.URL:
    case FieldType.NUMBER:
      return (
        <Input
          id={id}
          type={field.type.toLowerCase()}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={readOnly}
        />
      );

    case FieldType.TEXTAREA:
      return (
        <Textarea
          id={id}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={3}
          disabled={readOnly}
        />
      );

    case FieldType.DATE:
      return (
        <Input
          id={id}
          type="date"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={readOnly}
        />
      );

    case FieldType.SELECT:
      return (
        <Select value={strValue} onValueChange={readOnly ? undefined : onChange} disabled={readOnly}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case FieldType.RADIO:
      return (
        <RadioGroup value={strValue} onValueChange={readOnly ? undefined : onChange} disabled={readOnly}>
          {(field.options ?? []).map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={`${id}-${opt}`} />
              <Label htmlFor={`${id}-${opt}`} className="font-normal">{opt}</Label>
            </div>
          ))}
        </RadioGroup>
      );

    case FieldType.CHECKBOX: {
      // Task 10: store true/false booleans, not string literals
      const checked = value === true || value === "true";
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={checked}
            onCheckedChange={readOnly ? undefined : (c) => onChange(c === true)}
            disabled={readOnly}
          />
          <Label htmlFor={id} className="font-normal">{field.label}</Label>
        </div>
      );
    }

    case FieldType.MULTISELECT: {
      // Task 9: store as string[], not comma-joined string
      const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {(field.options ?? []).map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <Checkbox
                id={`${id}-${opt}`}
                checked={selected.includes(opt)}
                onCheckedChange={
                  readOnly
                    ? undefined
                    : (checked) => {
                        const next = checked
                          ? [...selected, opt]
                          : selected.filter((s) => s !== opt);
                        onChange(next);
                      }
                }
                disabled={readOnly}
              />
              <Label htmlFor={`${id}-${opt}`} className="font-normal">{opt}</Label>
            </div>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}
