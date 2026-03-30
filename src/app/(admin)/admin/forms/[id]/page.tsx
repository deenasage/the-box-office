// SPEC: form-builder.md
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { FormBuilderEditor } from "@/components/forms/FormBuilderEditor";
import { ChevronLeft, Eye } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { FormFieldConfig, ConditionalRule } from "@/types";

export default async function FormBuilderPage({
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
    conditions: f.conditions
      ? (JSON.parse(f.conditions) as ConditionalRule[])
      : undefined,
  }));

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href="/admin/forms"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to forms
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
            {template.isActive && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          {template.description && (
            <p className="text-muted-foreground mt-1">{template.description}</p>
          )}
        </div>
        <Link href={`/admin/forms/${template.id}/preview`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
        </Link>
      </div>

      <FormBuilderEditor templateId={template.id} initialFields={fields} />
    </div>
  );
}
