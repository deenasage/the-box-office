// SPEC: dependencies.md
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DependencyGraph } from "@/components/dependencies/DependencyGraph";

export default async function EpicDependenciesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const epic = await db.epic.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!epic) notFound();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dependencies</h1>
        <p className="text-sm text-muted-foreground">{epic.name}</p>
      </div>

      <DependencyGraph epicId={epic.id} />
    </div>
  );
}
