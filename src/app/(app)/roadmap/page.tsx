// SPEC: roadmap.md
import { db } from "@/lib/db";
import { RoadmapTabs } from "@/components/roadmap/RoadmapTabs";

export default async function RoadmapPage() {
  // Fetch all roadmap data server-side in parallel.
  // sprints and epics are available here for future use when RoadmapTabs
  // is updated to accept them as props (avoids duplicate client-side fetches).
  const [users, sprints, epics] = await Promise.all([
    db.user.findMany({
      select: { id: true, name: true, team: true },
      orderBy: { name: "asc" },
    }),
    db.sprint.findMany({
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, startDate: true, endDate: true, isActive: true },
    }),
    db.epic.findMany({
      orderBy: { startDate: "asc" },
      include: { roadmapItem: true },
    }),
  ]);

  // Serialize Date objects before crossing the server/client boundary
  const serializedSprints = sprints.map((s) => ({
    id: s.id,
    name: s.name,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    isActive: s.isActive,
  }));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
      <RoadmapTabs users={users} sprints={serializedSprints} epics={epics} />
    </div>
  );
}
