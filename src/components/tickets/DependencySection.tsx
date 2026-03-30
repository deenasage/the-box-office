// SPEC: tickets.md
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { SequencingWarning } from "@/lib/dependencies";
import { Dependency, DependencyGroup } from "@/components/tickets/DependencyRow";
import { AddDependencyForm } from "@/components/tickets/AddDependencyForm";
import { SequencingWarnings } from "@/components/tickets/SequencingWarnings";

interface DependencySectionProps {
  ticketId: string;
  userRole: string;
}

export function DependencySection({ ticketId, userRole }: DependencySectionProps) {
  const [loading, setLoading] = useState(true);
  const [dependenciesFrom, setDependenciesFrom] = useState<Dependency[]>([]);
  const [dependenciesTo, setDependenciesTo] = useState<Dependency[]>([]);
  const [warnings, setWarnings] = useState<SequencingWarning[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = userRole === "ADMIN" || userRole === "TEAM_LEAD";

  const fetchDeps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/dependencies`);
      if (!res.ok) {
        setError("Failed to load dependencies.");
        return;
      }
      const json = (await res.json()) as
        | {
            data: {
              dependenciesFrom: Dependency[];
              dependenciesTo: Dependency[];
              sequencingWarnings: SequencingWarning[];
            };
          }
        | {
            dependenciesFrom: Dependency[];
            dependenciesTo: Dependency[];
            sequencingWarnings: SequencingWarning[];
          };
      const payload = "data" in json ? json.data : json;
      setDependenciesFrom(payload.dependenciesFrom ?? []);
      setDependenciesTo(payload.dependenciesTo ?? []);
      setWarnings(payload.sequencingWarnings ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void fetchDeps();
  }, [fetchDeps]);

  async function handleRemove(depId: string) {
    await fetch(`/api/dependencies/${depId}`, { method: "DELETE" });
    void fetchDeps();
  }

  // "This ticket blocks" = fromTicket=this, type=BLOCKS  OR  toTicket=this, type=BLOCKED_BY
  const blocksGroup: { dep: Dependency; perspective: "from" | "to" }[] = [
    ...dependenciesFrom
      .filter((d) => d.type === "BLOCKS")
      .map((dep) => ({ dep, perspective: "from" as const })),
    ...dependenciesTo
      .filter((d) => d.type === "BLOCKED_BY")
      .map((dep) => ({ dep, perspective: "to" as const })),
  ];

  // "Blocked by" = fromTicket=this, type=BLOCKED_BY  OR  toTicket=this, type=BLOCKS
  const blockedByGroup: { dep: Dependency; perspective: "from" | "to" }[] = [
    ...dependenciesFrom
      .filter((d) => d.type === "BLOCKED_BY")
      .map((dep) => ({ dep, perspective: "from" as const })),
    ...dependenciesTo
      .filter((d) => d.type === "BLOCKS")
      .map((dep) => ({ dep, perspective: "to" as const })),
  ];

  // "Related" = either direction, type=RELATED
  const relatedGroup: { dep: Dependency; perspective: "from" | "to" }[] = [
    ...dependenciesFrom
      .filter((d) => d.type === "RELATED")
      .map((dep) => ({ dep, perspective: "from" as const })),
    ...dependenciesTo
      .filter((d) => d.type === "RELATED")
      .map((dep) => ({ dep, perspective: "to" as const })),
  ];

  const isEmpty =
    blocksGroup.length === 0 &&
    blockedByGroup.length === 0 &&
    relatedGroup.length === 0 &&
    warnings.length === 0;

  return (
    <div className="rounded-lg border bg-card space-y-0 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/20">
        <h3 className="text-sm font-semibold">Dependencies</h3>
        {canManage && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAdd((v) => !v)}
            aria-label="Add dependency"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 px-3 py-3">
          <p className="text-xs text-destructive flex-1">{error}</p>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => void fetchDeps()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <>
          <SequencingWarnings warnings={warnings} />

          {isEmpty && (
            <p className="text-sm text-muted-foreground px-3 py-4 text-center">
              No dependencies
            </p>
          )}

          <div className="divide-y">
            <DependencyGroup
              label="Blocks"
              deps={blocksGroup}
              canRemove={canManage}
              onRemove={handleRemove}
            />
            <DependencyGroup
              label="Blocked By"
              deps={blockedByGroup}
              canRemove={canManage}
              onRemove={handleRemove}
            />
            <DependencyGroup
              label="Related"
              deps={relatedGroup}
              canRemove={canManage}
              onRemove={handleRemove}
            />
          </div>
        </>
      )}

      {showAdd && (
        <AddDependencyForm
          ticketId={ticketId}
          onSuccess={() => {
            setShowAdd(false);
            void fetchDeps();
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
