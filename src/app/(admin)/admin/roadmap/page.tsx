// SPEC: roadmap.md
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RoadmapAdminClient } from "@/components/roadmap/RoadmapAdminClient";

export default async function RoadmapAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roadmap Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit roadmap item metadata inline. Changes save automatically.
        </p>
      </div>
      <RoadmapAdminClient />
    </div>
  );
}
