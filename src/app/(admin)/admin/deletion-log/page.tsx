// SPEC: design-improvements.md
// SPEC: sprint-scrum.md
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { DeletionLogTable } from "@/components/admin/DeletionLogTable";

export default async function DeletionLogPage() {
  const session = await auth();
  if (!session || session.user.role !== UserRole.ADMIN) {
    redirect("/");
  }

  const logs = await db.deletionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      deletedBy: { select: { name: true } },
      restoredBy: { select: { name: true } },
    },
  });

  // Serialize dates to ISO strings for client component
  const serialized = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    restoredAt: log.restoredAt ? log.restoredAt.toISOString() : null,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deletion Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Audit history of deleted sprints and tickets. Deleted entities can be
          restored to their original state (sprints are always restored as
          inactive; tickets are always restored with BACKLOG status).
        </p>
      </div>
      <DeletionLogTable initialLogs={serialized} />
    </div>
  );
}
