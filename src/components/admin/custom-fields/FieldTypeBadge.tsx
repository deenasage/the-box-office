// SPEC: custom-fields.md
import { Badge } from "@/components/ui/badge";

const TYPE_COLORS: Record<string, string> = {
  TEXT:     "bg-blue-100 text-blue-700",
  NUMBER:   "bg-purple-100 text-purple-700",
  DROPDOWN: "bg-amber-100 text-amber-700",
  DATE:     "bg-green-100 text-green-700",
  CHECKBOX: "bg-slate-100 text-slate-600",
};

const TYPE_LABELS: Record<string, string> = {
  TEXT:     "Text",
  NUMBER:   "Number",
  DROPDOWN: "Dropdown",
  DATE:     "Date",
  CHECKBOX: "Checkbox",
};

export function FieldTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type] ?? "bg-muted text-muted-foreground"}`}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}
