// SPEC: portfolio-view.md
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryStatusChart } from "./SummaryStatusChart";
import { SummaryTeamLoad } from "./SummaryTeamLoad";
import { MiniProgressBar } from "./MiniProgressBar";
import { formatDate } from "@/lib/utils";
import { PortfolioSummaryData } from "./portfolio-types";
import { AlertTriangle } from "lucide-react";

export function PortfolioSummary() {
  const [data, setData] = useState<PortfolioSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portfolio/summary")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load summary");
        return r.json() as Promise<PortfolioSummaryData>;
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-destructive/30 bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3" role="alert">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Initiatives by Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Initiatives by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryStatusChart byStatus={data.byStatus} />
        </CardContent>
      </Card>

      {/* Team Load */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team Load (Active Sprint)</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryTeamLoad teamLoad={data.teamLoad} />
        </CardContent>
      </Card>

      {/* Upcoming Delivery */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming Delivery</CardTitle>
          <p className="text-xs text-muted-foreground">Epics ending in the next 30 days</p>
        </CardHeader>
        <CardContent>
          {data.upcomingDelivery.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">None in the next 30 days.</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingDelivery.map((epic) => (
                <div key={epic.epicId} className="flex items-center justify-between gap-3">
                  <Link href={`/portfolio/${epic.epicId}`} className="text-sm font-medium hover:underline truncate min-w-0">
                    {epic.epicName}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(epic.endDate)}</span>
                    <MiniProgressBar done={epic.completionPct} total={100} pct={epic.completionPct} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* At Risk */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            At Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.atRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">No at-risk initiatives.</p>
          ) : (
            <div className="divide-y">
              {data.atRisk.map((epic) => (
                <div key={epic.epicId} className="flex items-center justify-between py-2">
                  <Link href={`/portfolio/${epic.epicId}`} className="text-sm font-medium hover:underline truncate min-w-0">
                    {epic.epicName}
                  </Link>
                  <span className="text-xs text-amber-600 font-medium shrink-0 ml-3">
                    {epic.warningCount} warning{epic.warningCount !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
