// SPEC: design-improvements.md
// SPEC: labels.md
import { db } from "@/lib/db";
import { LabelsManager } from "@/components/labels/LabelsManager";

export default async function AdminLabelsPage() {
  let labels;
  try {
    labels = await db.label.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tickets: true } } },
    });
  } catch {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-sm text-destructive">Failed to load labels. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Labels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage labels to categorize tickets across teams.
        </p>
      </div>
      <LabelsManager initialLabels={labels} />
    </div>
  );
}
