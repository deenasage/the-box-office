// SPEC: dependencies.md
"use client";

import { Team } from "@prisma/client";
import { NodeLayout, NODE_W, NODE_H } from "@/lib/graph-utils";
import { TEAM_LABELS } from "@/lib/constants";

// Hex fill colors for SVG nodes (one shade lighter than badge bg)
const TEAM_FILL: Record<Team, string> = {
  CONTENT: "#e0f2fe",   // sky-100
  DESIGN: "#ede9fe",    // violet-100
  SEO: "#d6f0e4",       // brand green tint
  WEM: "#fef3c7",       // amber-100
  PAID_MEDIA: "#f3e8ff", // purple-100
  ANALYTICS: "#cffafe", // cyan-100
};

const TEAM_STROKE: Record<Team, string> = {
  CONTENT: "#0ea5e9",
  DESIGN: "#7c3aed",
  SEO: "#008146",
  WEM: "#d97706",
  PAID_MEDIA: "#9333ea",
  ANALYTICS: "#0891b2",
};

interface GraphNodeProps {
  node: NodeLayout;
}

export function GraphNode({ node }: GraphNodeProps) {
  const team = node.ticket.team as Team;
  const fill = TEAM_FILL[team] ?? "#f1f5f9";
  const stroke = node.warnHighlight
    ? "#ef4444"
    : TEAM_STROKE[team] ?? "#94a3b8";
  const strokeWidth = node.warnHighlight || node.inCycle ? 2 : 1;
  const title =
    node.ticket.title.length > 20
      ? node.ticket.title.slice(0, 19) + "…"
      : node.ticket.title;

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={() => {
        window.location.href = `/tickets/${node.ticket.id}`;
      }}
      role="button"
      aria-label={`Go to ticket: ${node.ticket.title}`}
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
      {/* Cycle warning badge */}
      {node.inCycle && (
        <text
          x={node.x + NODE_W - 16}
          y={node.y + 14}
          fontSize={11}
          style={{ userSelect: "none" }}
        >
          ⚠
        </text>
      )}
    </g>
  );
}
