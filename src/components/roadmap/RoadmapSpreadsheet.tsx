// SPEC: roadmap.md
// SPEC: design-improvements.md
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoadmapItemStatus } from "@prisma/client";
import { RoadmapSpreadsheetRow, RoadmapItemRow } from "./RoadmapSpreadsheetRow";
import { RoadmapAddRow } from "./RoadmapAddRow";

type User = { id: string; name: string };

type Filters = {
  tier: string;
  category: string;
  initiative: string;
  region: string;
  ownerId: string;
  status: string;
  periodFrom: string;
  periodTo: string;
};

const STORAGE_KEY = "ticket-intake:roadmap-filters";

const DEFAULT_FILTERS: Filters = {
  tier: "",
  category: "",
  initiative: "",
  region: "",
  ownerId: "",
  status: "",
  periodFrom: "2026-02",
  periodTo: "2026-08",
};

function loadFilters(): Filters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<Filters>;
    return { ...DEFAULT_FILTERS, ...parsed };
  } catch {
    return DEFAULT_FILTERS;
  }
}

/** Count how many filter values differ from the defaults */
function countActiveFilters(filters: Filters): number {
  return (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).filter(
    (k) => filters[k] !== DEFAULT_FILTERS[k]
  ).length;
}

type Props = { users: User[] };

const STATUS_LABELS: Record<RoadmapItemStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  CARRIED_OVER: "Carried Over",
  NOT_COMMITTED: "Not Committed",
  CANCELLED: "Cancelled",
};

/** Derive sorted unique non-empty values for a string column from loaded items */
function uniqueValues(items: RoadmapItemRow[], key: keyof RoadmapItemRow): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const v = item[key];
    if (typeof v === "string" && v.trim()) seen.add(v.trim());
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function RoadmapSpreadsheet({ users }: Props) {
  const [items, setItems] = useState<RoadmapItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Restore filters from localStorage on mount
  useEffect(() => {
    setFilters(loadFilters());
    setFiltersLoaded(true);
  }, []);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    if (!filtersLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore storage errors
    }
  }, [filters, filtersLoaded]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.tier) params.set("tier", filters.tier);
      if (filters.category) params.set("category", filters.category);
      if (filters.initiative) params.set("initiative", filters.initiative);
      if (filters.region) params.set("region", filters.region);
      if (filters.ownerId) params.set("ownerId", filters.ownerId);
      if (filters.status) params.set("status", filters.status);
      if (filters.periodFrom) params.set("periodFrom", filters.periodFrom);
      if (filters.periodTo) params.set("periodTo", filters.periodTo);
      const res = await fetch(`/api/roadmap-items?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load roadmap items");
      const json = await res.json() as { data: RoadmapItemRow[] };
      setItems(json.data ?? []);
    } catch {
      // Leave items as-is on error; loading spinner will stop
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!filtersLoaded) return;
    void fetchItems();
  }, [fetchItems, filtersLoaded]);

  async function handlePatch(id: string, patch: Partial<RoadmapItemRow>) {
    await fetch(`/api/roadmap-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await fetchItems();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/roadmap-items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleAdd(data: { title: string; period: string; status: RoadmapItemStatus }) {
    await fetch("/api/roadmap-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await fetchItems();
  }

  /** Move a row up within its period group by swapping sortOrder values */
  async function handleMoveUp(id: string, period: string) {
    const group = grouped[period] ?? [];
    const idx = group.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    const above = group[idx - 1];
    const current = group[idx];
    // Swap sort orders
    await Promise.all([
      fetch(`/api/roadmap-items/${above.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: current.sortOrder }),
      }),
      fetch(`/api/roadmap-items/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: above.sortOrder }),
      }),
    ]);
    await fetchItems();
  }

  /** Move a row down within its period group by swapping sortOrder values */
  async function handleMoveDown(id: string, period: string) {
    const group = grouped[period] ?? [];
    const idx = group.findIndex((i) => i.id === id);
    if (idx < 0 || idx >= group.length - 1) return;
    const below = group[idx + 1];
    const current = group[idx];
    await Promise.all([
      fetch(`/api/roadmap-items/${below.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: current.sortOrder }),
      }),
      fetch(`/api/roadmap-items/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: below.sortOrder }),
      }),
    ]);
    await fetchItems();
  }

  // Group by period
  const grouped = items.reduce<Record<string, RoadmapItemRow[]>>((acc, item) => {
    (acc[item.period] ??= []).push(item);
    return acc;
  }, {});
  const periods = Object.keys(grouped).sort();

  function setFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="space-y-4">
      {/* Filter bar — sticky so it stays visible while scrolling */}
      <div className="sticky top-0 z-10 flex flex-wrap gap-2 p-3 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 rounded-lg border shadow-sm">
        {/* Tier dropdown */}
        <Select value={filters.tier || "_all"} onValueChange={(v) => setFilter("tier", (!v || v === "_all") ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-28" aria-label="Filter by tier">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-xs">
              {filters.tier || "Tier"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Tiers</SelectItem>
            {uniqueValues(items, "tier").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        {/* Category dropdown */}
        <Select value={filters.category || "_all"} onValueChange={(v) => setFilter("category", (!v || v === "_all") ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-32" aria-label="Filter by category">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-xs">
              {filters.category || "Category"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Categories</SelectItem>
            {uniqueValues(items, "category").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        {/* Initiative text filter */}
        <Input
          placeholder="Initiative"
          aria-label="Filter by initiative"
          value={filters.initiative}
          onChange={(e) => setFilter("initiative", e.target.value)}
          className="h-8 text-xs w-28"
        />
        {/* Region dropdown */}
        <Select value={filters.region || "_all"} onValueChange={(v) => setFilter("region", (!v || v === "_all") ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-28" aria-label="Filter by region">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-xs">
              {filters.region || "Region"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Regions</SelectItem>
            {uniqueValues(items, "region").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filters.ownerId || "all"}
          onValueChange={(v) => setFilter("ownerId", v === "all" ? "" : (v ?? ""))}
        >
          <SelectTrigger className="h-8 text-xs w-36">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-xs">
              {filters.ownerId ? (users.find((u) => u.id === filters.ownerId)?.name ?? filters.ownerId) : "All Owners"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status || "all"}
          onValueChange={(v) => setFilter("status", v === "all" ? "" : (v ?? ""))}
        >
          <SelectTrigger className="h-8 text-xs w-36">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-xs">
              {filters.status ? (STATUS_LABELS[filters.status as RoadmapItemStatus] ?? filters.status) : "All Statuses"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.values(RoadmapItemStatus) as RoadmapItemStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month range pickers */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="roadmap-period-from" className="text-xs text-muted-foreground">From</label>
          <input
            id="roadmap-period-from"
            type="month"
            value={filters.periodFrom}
            onChange={(e) => setFilter("periodFrom", e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor="roadmap-period-to" className="text-xs text-muted-foreground">To</label>
          <input
            id="roadmap-period-to"
            type="month"
            value={filters.periodTo}
            onChange={(e) => setFilter("periodTo", e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Active filter count badge + clear button */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 ml-1">
            <Badge variant="secondary" className="text-xs h-6 px-2">
              {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b text-left">
                <th className="px-3 py-3 text-xs font-semibold text-foreground w-16" aria-label="Row order" />
                <th className="px-3 py-3 text-xs font-semibold text-foreground w-24">Tier</th>
                <th className="px-3 py-3 text-xs font-semibold text-foreground w-28">Category</th>
                <th className="px-3 py-3 text-xs font-semibold text-foreground w-32">Initiative</th>
                <th className="px-3 py-3 text-xs font-semibold text-foreground w-20">Region</th>
                <th className="px-3 py-3 text-xs font-semibold text-foreground">Item</th>
                <th className="px-3 py-3 text-xs font-semibold text-foreground w-36">Owner</th>
                <th className="px-3 py-3 text-xs font-semibold text-foreground w-36">Status</th>
                <th className="px-3 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted-foreground py-12 text-sm">
                    No roadmap items yet. Add one below.
                  </td>
                </tr>
              ) : (
                periods.map((period) => {
                  const groupItems = grouped[period];
                  return (
                    <React.Fragment key={period}>
                      {/* Period group header */}
                      <tr className="bg-muted/40 border-b">
                        <td colSpan={9} className="px-3 py-1.5">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs font-semibold">
                              {formatPeriod(period)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {groupItems.length} item{groupItems.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {groupItems.map((item, idx) => (
                        <RoadmapSpreadsheetRow
                          key={item.id}
                          item={item}
                          users={users}
                          onPatch={handlePatch}
                          onDelete={handleDelete}
                          onMoveUp={idx > 0 ? () => handleMoveUp(item.id, period) : undefined}
                          onMoveDown={idx < groupItems.length - 1 ? () => handleMoveDown(item.id, period) : undefined}
                        />
                      ))}
                      {/* Add row appears once per period group */}
                      <RoadmapAddRow period={period} onAdd={handleAdd} />
                    </React.Fragment>
                  );
                })
              )}
              {/* Add row for the current month when no items exist yet */}
              {periods.length === 0 && (
                <RoadmapAddRow
                  period={new Date().toISOString().slice(0, 7)}
                  onAdd={handleAdd}
                />
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
