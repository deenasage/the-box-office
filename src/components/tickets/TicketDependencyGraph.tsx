// SPEC: dependencies.md
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, GitBranch } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketStatus, Team, DependencyType } from "@prisma/client";
import {
  detectCycles,
  computeLayout,
  arrowPath,
  type GraphTicket,
  type NodeLayout,
  NODE_W,
  NODE_H,
} from "@/lib/graph-utils";
import { TEAM_LABELS } from "@/lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  title: string;
  status: TicketStatus;
  team: Team;
}

interface GraphEdge {
  from: string;
  to: string;
  type: DependencyType;
}

interface ApiResponse {
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

interface SprintOption {
  id: string;
  name: string;
}

interface SprintsApiResponse {
  data: SprintOption[];
}

// ── Node fill colors (same as epic DependencyGraph) ──────────────────────────

const STATUS_FILL: Record<TicketStatus, string> = {
  BACKLOG:     "#f8fafc",  // slate-50
  TODO:        "#eff6ff",  // blue-50
  READY:       "#f0f9ff",  // sky-50
  IN_PROGRESS: "#dbeafe",  // blue-100
  IN_REVIEW:   "#ede9fe",  // violet-100
  BLOCKED:     "#fee2e2",  // red-100
  DONE:        "#dcfce7",  // green-100
};

const STATUS_STROKE: Record<TicketStatus, string> = {
  BACKLOG:     "#94a3b8",
  TODO:        "#2563eb",
  READY:       "#0284c7",
  IN_PROGRESS: "#2563eb",
  IN_REVIEW:   "#7c3aed",
  BLOCKED:     "#dc2626",
  DONE:        "#16a34a",
};

const TEAM_FILL: Record<Team, string> = {
  CONTENT: "#e0f2fe",
  DESIGN: "#ede9fe",
  SEO: "#d6f0e4",
  WEM: "#fef3c7",
  PAID_MEDIA: "#f3e8ff",
  ANALYTICS: "#cffafe",
};

const TEAM_STROKE: Record<Team, string> = {
  CONTENT: "#0ea5e9",
  DESIGN: "#7c3aed",
  SEO: "#008146",
  WEM: "#d97706",
  PAID_MEDIA: "#9333ea",
  ANALYTICS: "#0891b2",
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface NodeProps {
  node: NodeLayout;
  statusMap: Map<string, TicketStatus>;
}

function DepNode({ node, statusMap }: NodeProps) {
  const router = useRouter();
  const status = statusMap.get(node.id);
  const team = node.ticket.team as Team;

  // Colour by status if available, otherwise fall back to team colour
  const fill = status ? STATUS_FILL[status] : (TEAM_FILL[team] ?? "#f1f5f9");
  const stroke = node.warnHighlight
    ? "#ef4444"
    : node.inCycle
    ? "#f59e0b"
    : status
    ? STATUS_STROKE[status]
    : (TEAM_STROKE[team] ?? "#94a3b8");
  const strokeWidth = node.warnHighlight || node.inCycle ? 2 : 1;

  const title =
    node.ticket.title.length > 22
      ? node.ticket.title.slice(0, 21) + "…"
      : node.ticket.title;

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={() => router.push(`/tickets/${node.ticket.id}`)}
      role="button"
      aria-label={`Go to ticket: ${node.ticket.title}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/tickets/${node.ticket.id}`);
        }
      }}
    >
      <rect
        x={node.x}
        y={node.y}
        width={NODE_W}
        height={NODE_H}
        rx={6}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/* Team label */}
      <text
        x={node.x + 8}
        y={node.y + 15}
        fontSize={9}
        fontWeight="600"
        fill={TEAM_STROKE[team] ?? "#64748b"}
        style={{ userSelect: "none" }}
      >
        {TEAM_LABELS[team] ?? team}
      </text>
      {/* Ticket title */}
      <text
        x={node.x + 8}
        y={node.y + 32}
        fontSize={11}
        fill="#1e293b"
        style={{ userSelect: "none" }}
      >
        {title}
      </text>
      {/* Cycle indicator */}
      {node.inCycle && (
        <text
          x={node.x + NODE_W - 16}
          y={node.y + 14}
          fontSize={11}
          style={{ userSelect: "none" }}
          aria-hidden="true"
        >
          ⚠
        </text>
      )}
    </g>
  );
}

interface EdgeRenderProps {
  from: NodeLayout;
  to: NodeLayout;
  type: DependencyType;
}

function DepEdge({ from, to, type }: EdgeRenderProps) {
  const path = arrowPath(from, to);

  if (type === "BLOCKS") {
    return (
      <path
        d={path}
        fill="none"
        stroke="#ef4444"
        strokeWidth={1.5}
        markerEnd="url(#arrow-blocks)"
      />
    );
  }
  if (type === "BLOCKED_BY") {
    return (
      <path
        d={path}
        fill="none"
        stroke="#f97316"
        strokeWidth={1.5}
        strokeDasharray="6 3"
        markerEnd="url(#arrow-blocked-by)"
      />
    );
  }
  // RELATED
  return (
    <path
      d={path}
      fill="none"
      stroke="#94a3b8"
      strokeWidth={1}
      strokeDasharray="5 3"
    />
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-3 px-1">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-6 h-0.5 bg-red-500" />
        Blocks
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-6 h-0.5 bg-orange-400" style={{ borderTop: "2px dashed #f97316" }} />
        Blocked by
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-6 h-0.5 bg-slate-400" style={{ borderTop: "2px dashed #94a3b8" }} />
        Related
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TicketDependencyGraph() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [sprintFilter, setSprintFilter] = useState<string>("_all");

  // Fetch sprint list for the filter dropdown
  useEffect(() => {
    fetch("/api/sprints?limit=50")
      .then((r) => r.json())
      .then((res: SprintsApiResponse) => {
        setSprints(res.data ?? []);
      })
      .catch(() => {});
  }, []);

  // Fetch graph data whenever sprint filter changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs =
      sprintFilter !== "_all" ? `?sprintId=${sprintFilter}` : "";
    fetch(`/api/tickets/dependency-graph${qs}`)
      .then((r) => r.json())
      .then((res: ApiResponse) => {
        setNodes(res.data?.nodes ?? []);
        setEdges(res.data?.edges ?? []);
      })
      .catch(() => {
        setError("Failed to load dependency graph. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [sprintFilter]);

  // Build status map for node colouring
  const statusMap = useMemo(() => {
    const m = new Map<string, TicketStatus>();
    for (const n of nodes) m.set(n.id, n.status);
    return m;
  }, [nodes]);

  // Compute layout using the shared graph-utils (team-column layout)
  const { layout, viewBox, edgeLayouts } = useMemo(() => {
    if (nodes.length === 0) {
      return { layout: [], viewBox: "0 0 400 200", edgeLayouts: [] };
    }

    const tickets: GraphTicket[] = nodes.map((n) => ({
      id: n.id,
      title: n.title,
      team: n.team,
      status: n.status,
    }));

    const blocksEdges = edges
      .filter((e) => e.type === "BLOCKS")
      .map((e) => ({ from: e.from, to: e.to }));

    const cycleIds = detectCycles(
      tickets.map((t) => t.id),
      blocksEdges
    );

    const nodeLayout = computeLayout(tickets, new Set<string>(), cycleIds);

    const maxX = Math.max(...nodeLayout.map((n) => n.x + NODE_W), 0) + 40;
    const maxY = Math.max(...nodeLayout.map((n) => n.y + NODE_H), 0) + 40;
    const vb = `0 0 ${maxX} ${maxY}`;

    const nodeMap = new Map<string, NodeLayout>(
      nodeLayout.map((n) => [n.id, n])
    );

    const edgeLayouts = edges.flatMap((e) => {
      const from = nodeMap.get(e.from);
      const to = nodeMap.get(e.to);
      if (!from || !to) return [];
      return [{ from, to, type: e.type }];
    });

    return { layout: nodeLayout, viewBox: vb, edgeLayouts };
  }, [nodes, edges]);

  return (
    <div className="space-y-4">
      {/* Sprint filter */}
      <div className="flex items-center gap-3">
        <label htmlFor="sprint-filter" className="text-sm text-muted-foreground shrink-0">
          Sprint
        </label>
        <Select value={sprintFilter} onValueChange={(v) => setSprintFilter(v ?? "")}>
          <SelectTrigger id="sprint-filter" className="w-52 h-8 text-sm">
            <SelectValue>
              {sprintFilter === "_all"
                ? "All tickets"
                : sprints.find((s) => s.id === sprintFilter)?.name ?? "All tickets"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All tickets</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <p className="text-sm text-destructive py-4">{error}</p>
      )}

      {/* Empty state */}
      {!loading && !error && nodes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground/40 mb-4" aria-hidden="true" />
          <h3 className="text-base font-medium text-foreground">No dependencies found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Add dependencies to tickets to see them visualised here.
          </p>
          <a
            href="/tickets"
            className="mt-4 text-sm text-primary hover:underline font-medium"
          >
            Browse tickets to add dependencies
          </a>
        </div>
      )}

      {/* Graph */}
      {!loading && !error && nodes.length > 0 && (
        <>
          <div
            className="overflow-auto rounded-lg border bg-white dark:bg-card p-2"
            role="region"
            aria-label="Ticket dependency graph"
          >
            <svg
              viewBox={viewBox}
              style={{ minWidth: "100%", display: "block" }}
              aria-label="Dependency graph showing ticket relationships"
              role="img"
            >
              <defs>
                <marker
                  id="arrow-blocks"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L8,3 z" fill="#ef4444" />
                </marker>
                <marker
                  id="arrow-blocked-by"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L8,3 z" fill="#f97316" />
                </marker>
              </defs>

              {/* Edges first so nodes render on top */}
              {edgeLayouts.map((e, i) => (
                <DepEdge key={i} from={e.from} to={e.to} type={e.type} />
              ))}

              {/* Nodes */}
              {layout.map((node) => (
                <DepNode key={node.id} node={node} statusMap={statusMap} />
              ))}
            </svg>
          </div>

          <Legend />
        </>
      )}
    </div>
  );
}
