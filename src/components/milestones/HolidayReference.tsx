// SPEC: milestones.md
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HOLIDAYS,
  REGION_LABELS,
  ALL_REGIONS,
  resolveHolidayDate,
  type Region,
} from "@/lib/holidays";
import type { MilestoneData } from "./MilestoneDialog";

const YEARS = [2024, 2025, 2026, 2027] as const;
type SupportedYear = (typeof YEARS)[number];

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface Props {
  onMilestoneAdded: (milestone: MilestoneData) => void;
}

export function HolidayReference({ onMilestoneAdded }: Props) {
  const currentYear = new Date().getFullYear();
  const defaultYear: SupportedYear =
    (YEARS as readonly number[]).includes(currentYear)
      ? (currentYear as SupportedYear)
      : 2026;

  const [year, setYear] = useState<SupportedYear>(defaultYear);
  const [regions, setRegions] = useState<Set<Region>>(new Set(ALL_REGIONS));
  const [adding, setAdding] = useState<string | null>(null);

  function toggleRegion(region: Region) {
    setRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  }

  const filtered = HOLIDAYS.filter((h) => regions.has(h.region))
    .map((h) => {
      const resolved = resolveHolidayDate(h, year);
      if (!resolved) return null;
      const date = new Date(year, resolved.month - 1, resolved.day);
      return { holiday: h, date };
    })
    .filter((entry): entry is { holiday: (typeof HOLIDAYS)[number]; date: Date } => entry !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  async function handleAdd(name: string, date: Date) {
    const key = `${name}-${date.toISOString()}`;
    setAdding(key);
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${name} ${year}`,
          date: date.toISOString(),
          color: "#6366f1",
        }),
      });
      const json = await res.json() as { data?: MilestoneData; error?: unknown };
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Failed to add milestone");
        return;
      }
      toast.success(`Added "${name} ${year}" to key dates`);
      onMilestoneAdded(json.data!);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setAdding(null);
    }
  }

  return (
    <details className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors list-none">
        <span>Holiday Reference</span>
        <svg
          className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </summary>

      <div className="border-t border-border px-4 py-4 space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-start gap-6">
          {/* Year picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Year</Label>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v) as SupportedYear)}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region checkboxes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Regions</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {ALL_REGIONS.map((r) => (
                <div key={r} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`region-${r}`}
                    checked={regions.has(r)}
                    onCheckedChange={() => toggleRegion(r)}
                    aria-label={`Toggle ${REGION_LABELS[r]}`}
                  />
                  <Label htmlFor={`region-${r}`} className="text-xs cursor-pointer">
                    {r} — {REGION_LABELS[r]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No holidays match the selected regions.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">Holiday</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-foreground w-12">Region</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-foreground w-36">Date</th>
                  <th className="px-3 py-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ holiday, date }) => {
                  const key = `${holiday.name}-${date.toISOString()}`;
                  return (
                    <tr key={key} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 text-xs">{holiday.name}</td>
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{holiday.region}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(date)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          disabled={adding === key}
                          onClick={() => void handleAdd(holiday.name, date)}
                          aria-label={`Add ${holiday.name} ${year} to key dates`}
                        >
                          {adding === key ? "Adding…" : "Add"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}
