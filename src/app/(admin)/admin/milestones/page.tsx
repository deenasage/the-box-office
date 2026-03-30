// SPEC: design-improvements.md
// SPEC: roadmap.md
import { db } from "@/lib/db";
import { MilestonesClient } from "./MilestonesClient";

export default async function MilestonesPage() {
  const milestones = await db.milestone.findMany({
    orderBy: { date: "asc" },
  });

  const serialized = milestones.map((m) => ({
    ...m,
    date: m.date.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Key Dates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Named date markers shown on the roadmap timeline.
        </p>
      </div>
      <MilestonesClient initialMilestones={serialized} />
    </div>
  );
}
