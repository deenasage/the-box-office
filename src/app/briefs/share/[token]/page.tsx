// SPEC: brief-to-epic-workflow.md
// Phase 1 — Public stakeholder review page (no auth required)
// Lives outside (app) group — no sidebar, no auth wrapper

import { Suspense } from "react";
import { PublicShareClient } from "./PublicShareClient";

export const metadata = {
  title: "Brief Review | The Box Office",
};

// Force dynamic so token lookups are always fresh
export const dynamic = "force-dynamic";

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal branded header — no nav, no sidebar */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-2.5">
        <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground text-[11px] font-bold">TBO</span>
        </div>
        <span className="font-semibold text-sm">The Box Office</span>
      </header>

      <main className="px-4 py-10 max-w-2xl mx-auto">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
          <PublicShareClient token={token} />
        </Suspense>
      </main>
    </div>
  );
}
