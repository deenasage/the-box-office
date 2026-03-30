// SPEC: design-improvements.md
// SPEC: sprint-scrum.md
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SprintCompare } from "@/components/sprints/SprintCompare";

export default async function SprintComparePage() {
  const sprints = await db.sprint.findMany({
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isActive: true,
    },
    orderBy: { startDate: "desc" },
  });

  const serialized = sprints.map((s) => ({
    id: s.id,
    name: s.name,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    isActive: s.isActive,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/sprints"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sprints
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sprint Comparison</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compare metrics across up to 5 sprints side-by-side.
          </p>
        </div>
      </div>

      <SprintCompare sprints={serialized} />
    </div>
  );
}
