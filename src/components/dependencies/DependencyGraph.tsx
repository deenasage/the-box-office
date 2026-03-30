// SPEC: dependencies.md
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { SequencingWarning } from "@/lib/dependencies";
import {
  detectCycles,
  computeLayout,
  arrowPath,
  GraphTicket,
  NodeLayout,
  NODE_W,
  NODE_H,
} from "@/lib/graph-utils";
import { GraphNode } from "@/components/dependencies/GraphNode";

type DepType = "BLOCKS" | "RELATED" | "BLOCKED_BY";

interface GraphDependency {
  id: string;
  fromTicketId: string;
  toTicketId: string;
  type: DepType;
}

interface ApiResponse {
  tickets: GraphTicket[];
  dependencies: GraphDependency[];
  sequencingWarnings: SequencingWarning[];
}

interface DependencyGraphProps {
  epicId: string;
}

interface EdgeProps {
  from: NodeLayout;
  to: NodeLayout;
  type: DepType;
  isWarning: boolean;
}

function Edge({ from, to, type, isWarning }: EdgeProps) {
  const isRelated = type === "RELATED";
  const color = isWarning ? "#ef4444" : "#94a3b8";
  const path = arrowPath(from, to);
  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray={isRelated ? "5 3" : undefined}
      markerEnd={
        isRelated ? undefined : `url(#arrow-${isWarning ? "warn" : "normal"})`
      }
    />
  );
}

export function DependencyGraph({ epicId }: DependencyGraphProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchGraph() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/epics/${epicId}/dependencies`);
        if (!res.ok) {
          setError("Failed to load dependency graph.");
          return;
        }
        const json = (await res.json()) as ApiResponse;
        setData(json);
      } catch {
        setError("Network error — please try again.");
      } finally {
        setLoading(false);
      }
    }
    void fetchGraph();
  }, [epicId]);

  const { layout, viewBox, edges } = useMemo(() => {
    if (!data || data.tickets.length === 0) {
      return { layout: [], viewBox: "0 0 400 200", edges: [] };
    }

    const warnIds = new Set<string>();
    for (const w of data.sequencingWarnings ?? []) {
      warnIds.add(w.blockerId);
      warnIds.add(w.dependentId);
    }

    const blocksEdges = data.dependencies
      .filter((d) => d.type === "BLOCKS")
      .map((d) => ({ from: d.fromTicketId, to: d.toTicketId }));

    const cycleIds = detectCycles(
      data.tickets.map((t) => t.id),
      blocksEdges
    );

    const nodeLayout = computeLayout(data.tickets, warnIds, cycleIds);

    const maxX = Math.max(...nodeLayout.map((n) => n.x + NODE_W), 0) + 40;
    const maxY = Math.max(...nodeLayout.map((n) => n.y + NODE_H), 0) + 40;
    const vb = `0 0 ${maxX} ${maxY}`;

    const nodeMap = new Map<string, NodeLayout>(
      nodeLayout.map((n) => [n.id, n])
    );

    const edgeList = data.dependencies.flatMap((dep) => {
      const from = nodeMap.get(dep.fromTicketId);
      const to = nodeMap.get(dep.toTicketId);
      if (!from || !to) return [];
      const isWarning =
        dep.type === "BLOCKS" &&
        (warnIds.has(dep.fromTicketId) || warnIds.has(dep.toTicketId));
      return [{ from, to, type: dep.type as DepType, isWarning }];
    });

    return { layout: nodeLayout, viewBox: vb, edges: edgeList };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive px-4 py-4">{error}</p>;
  }

  if (!data || data.tickets.length === 0 || data.dependencies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-16">
        No dependencies mapped for this epic.
      </p>
    );
  }

  return (
    <div ref={containerRef} className="overflow-auto rounded-lg border bg-white p-2">
      <svg
        viewBox={viewBox}
        style={{ minWidth: "100%", display: "block" }}
        aria-label="Dependency graph"
        role="img"
      >
        <defs>
          <marker
            id="arrow-normal"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
          </marker>
          <marker
            id="arrow-warn"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill="#ef4444" />
          </marker>
        </defs>
        {/* Draw edges first so nodes appear on top */}
        {edges.map((e, i) => (
          <Edge
            key={i}
            from={e.from}
            to={e.to}
            type={e.type}
            isWarning={e.isWarning}
          />
        ))}
        {layout.map((node) => (
          <GraphNode key={node.id} node={node} />
        ))}
      </svg>

      {(data.sequencingWarnings ?? []).length > 0 && (
        <div className="mt-3 space-y-1">
          {data.sequencingWarnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
            >
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
