// SPEC: portfolio-view.md
// SPEC: design-improvements.md
"use client";

import { Suspense, useState } from "react";
import { PortfolioList } from "@/components/portfolio/PortfolioList";
import { EpicFormDialog, EpicData } from "@/components/epics/EpicFormDialog";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeletons";
import { BarChart2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PortfolioPage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSaved(_epic: EpicData) {
    setShowCreate(false);
    setRefreshKey((k) => k + 1);
    router.refresh();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Initiatives and epics across all teams</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Project
          </Button>
          <Link href="/portfolio/summary">
            <Button variant="outline" size="sm">
              <BarChart2 className="h-4 w-4 mr-1.5" />
              Summary
            </Button>
          </Link>
        </div>
      </div>

      <Suspense fallback={
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      }>
        <PortfolioList refreshKey={refreshKey} />
      </Suspense>

      {showCreate && (
        <EpicFormDialog
          onSaved={handleSaved}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
