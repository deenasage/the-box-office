// SPEC: form-builder.md
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { FieldRenderer } from "@/components/forms/FieldRenderer";
import { evaluateConditions } from "@/lib/form-logic";
import type { FormFieldConfig, ConditionalRule } from "@/types";

export default async function FormPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const template = await db.formTemplate.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  if (!template) notFound();

  const fields: FormFieldConfig[] = template.fields.map((f) => ({
    id: f.id,
    label: f.label,
    fieldKey: f.fieldKey,
    type: f.type,
    required: f.required,
    order: f.order,
    options: f.options ? (JSON.parse(f.options) as string[]) : undefined,
    conditions: f.conditions ? (JSON.parse(f.conditions) as ConditionalRule[]) : undefined,
  }));

  // Evaluate with empty values — shows default visibility state
  const emptyValues = {};
  const visibleFields = fields.filter((f) => {
    const { visible } = evaluateConditions(f, emptyValues);
    return visible;
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link
        href={`/admin/forms/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to editor
      </Link>

      {/* Preview banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
        Preview mode — This is how the form appears to submitters
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
        {template.description && (
          <p className="text-muted-foreground mt-1">{template.description}</p>
        )}
      </div>

      <div className="space-y-5">
        {visibleFields.map((field) => {
          const { required } = evaluateConditions(field, emptyValues);
          return (
            <FieldRenderer
              key={field.id}
              field={field}
              value={undefined}
              onChange={() => undefined}
              required={required}
              readOnly
            />
          );
        })}
        {visibleFields.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No fields are visible with default values.
          </p>
        )}
      </div>
    </div>
  );
}
