// SPEC: form-builder.md
// SPEC: design-improvements.md
import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, FileSliders } from "lucide-react";
import { NewTemplateButton, TemplateRowActions } from "@/components/forms/TemplateListActions";

export default async function AdminFormsPage() {
  let templates;
  try {
    templates = await db.formTemplate.findMany({
      include: { _count: { select: { fields: true, tickets: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-sm text-destructive">Failed to load form templates. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Form Builder</h1>
        <NewTemplateButton />
      </div>

      <div className="grid gap-4">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  {t.isActive && <Badge variant="default">Active</Badge>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <TemplateRowActions id={t.id} name={t.name} isActive={t.isActive} />
                  <Link href={`/admin/forms/${t.id}`}>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  </Link>
                </div>
              </div>
              {t.description && (
                <p className="text-sm text-muted-foreground">{t.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t._count.fields} fields · {t._count.tickets} tickets submitted
              </p>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <FileSliders className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No form templates yet</p>
              <p className="text-sm text-muted-foreground">
                Create a template to customise the intake form fields for each team.
              </p>
            </div>
            <NewTemplateButton />
          </div>
        )}
      </div>
    </div>
  );
}
