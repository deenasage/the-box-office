// SPEC: portfolio-view.md
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PortfolioFilters } from "./PortfolioFilters";
import { PortfolioTable } from "./PortfolioTable";
import { PortfolioStatsBar } from "./PortfolioStatsBar";
import { PaginationControls } from "./PaginationControls";
import { PortfolioListItem, PortfolioListResponse } from "./portfolio-types";

const DEFAULT_STATUSES = ["INTAKE", "IN_BRIEF", "BRIEFED", "IN_PLANNING", "IN_PROGRESS", "DONE", "ON_HOLD"];

export function PortfolioList({ refreshKey = 0 }: { refreshKey?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<PortfolioListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statsInProgress, setStatsInProgress] = useState(0);
  const [statsCompleted, setStatsCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const team = searchParams.get("team") ?? "ALL";
  const sprintId = searchParams.get("sprintId") ?? "ALL";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const statusParam = searchParams.get("status");
  const statuses = statusParam ? statusParam.split(",").filter(Boolean) : DEFAULT_STATUSES;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === "" || value === "ALL") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`/portfolio?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (team !== "ALL") params.set("team", team);
    if (sprintId !== "ALL") params.set("sprintId", sprintId);
    if (statuses.length > 0) params.set("status", statuses.join(","));
    params.set("page", String(page));

    fetch(`/api/portfolio?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load portfolio");
        return r.json() as Promise<PortfolioListResponse>;
      })
      .then((data) => {
        setItems(data.data);
        setTotal(data.total);
        setStatsInProgress(data.inProgressTotal);
        setStatsCompleted(data.completedTotal);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Unknown error");
      })
      .finally(() => setLoading(false));
  }, [team, sprintId, page, statusParam, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <PortfolioFilters
        team={team}
        statuses={statuses}
        sprintId={sprintId}
        onTeamChange={(v) => updateParams({ team: v, page: "1" })}
        onStatusesChange={(v) => updateParams({ status: v.join(","), page: "1" })}
        onSprintChange={(v) => updateParams({ sprintId: v, page: "1" })}
      />

      {error && (
        <div className="border border-destructive/30 bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <PortfolioStatsBar
          total={total}
          inProgress={statsInProgress}
          completed={statsCompleted}
        />
      )}

      {loading ? (
        <div className="space-y-2" aria-label="Loading portfolio">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <PortfolioTable items={items} />
          <PaginationControls
            page={page}
            total={total}
            limit={30}
            onPageChange={(p) => updateParams({ page: String(p) })}
          />
        </>
      )}
    </div>
  );
}
