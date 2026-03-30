// SPEC: design-improvements.md
// SPEC: roadmap.md
import { db } from "@/lib/db";
import { EpicAdminTable } from "@/components/epics/EpicAdminTable";

export default async function AdminEpicsPage() {
  const epics = await db.epic.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
      team: true,
      startDate: true,
      endDate: true,
      _count: { select: { tickets: true } },
    },
  });

  const serialized = epics.map((e) => ({
    id: e.id,
    name: e.name,
    color: e.color,
    status: e.status,
    team: e.team,
    startDate: e.startDate ? e.startDate.toISOString() : null,
    endDate: e.endDate ? e.endDate.toISOString() : null,
    ticketCount: e._count.tickets,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Epics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage epics to group related tickets on the roadmap.
        </p>
      </div>
      <EpicAdminTable initialEpics={serialized} />
    </div>
  );
}
