// SPEC: dependencies.md

import { Team } from "@prisma/client";

export interface GraphTicket {
  id: string;
  title: string;
  team: Team;
  status: string;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface NodeLayout {
  id: string;
  ticket: GraphTicket;
  x: number;
  y: number;
  inCycle: boolean;
  warnHighlight: boolean;
}

// Topological ordering for layout columns
export const TEAM_ORDER: Team[] = [
  "DESIGN",
  "WEM",
  "SEO",
  "CONTENT",
  "PAID_MEDIA",
  "ANALYTICS",
];

export const NODE_W = 160;
export const NODE_H = 50;
export const COL_GAP = 220;
export const ROW_GAP = 70;
export const PADDING = 40;

/**
 * DFS cycle detection.
 * Returns a Set of node IDs that participate in at least one cycle.
 */
export function detectCycles(
  nodeIds: string[],
  edges: GraphEdge[]
): Set<string> {
  const adjList = new Map<string, string[]>();
  for (const id of nodeIds) adjList.set(id, []);
  for (const e of edges) adjList.get(e.from)?.push(e.to);

  const inCycle = new Set<string>();
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string): boolean {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    let foundCycle = false;
    for (const next of adjList.get(node) ?? []) {
      if (dfs(next)) {
        inCycle.add(next);
        foundCycle = true;
      }
    }
    if (foundCycle) inCycle.add(node);
    stack.delete(node);
    return false;
  }

  for (const id of nodeIds) {
    if (!visited.has(id)) dfs(id);
  }
  return inCycle;
}

/**
 * Compute a simple team-column layered layout for nodes.
 * Tickets are placed in columns based on their team's position in TEAM_ORDER,
 * and stacked vertically within each column.
 */
export function computeLayout(
  tickets: GraphTicket[],
  warnIds: Set<string>,
  cycleIds: Set<string>
): NodeLayout[] {
  const columns: Map<number, GraphTicket[]> = new Map();
  for (const t of tickets) {
    const col = TEAM_ORDER.indexOf(t.team);
    const colIdx = col === -1 ? TEAM_ORDER.length : col;
    if (!columns.has(colIdx)) columns.set(colIdx, []);
    columns.get(colIdx)!.push(t);
  }

  const layout: NodeLayout[] = [];
  for (const [colIdx, colTickets] of columns) {
    const x = PADDING + colIdx * COL_GAP;
    colTickets.forEach((ticket, rowIdx) => {
      layout.push({
        id: ticket.id,
        ticket,
        x,
        y: PADDING + rowIdx * ROW_GAP,
        inCycle: cycleIds.has(ticket.id),
        warnHighlight: warnIds.has(ticket.id),
      });
    });
  }
  return layout;
}

/**
 * Compute the SVG cubic-bezier path string for an arrow between two laid-out nodes.
 * The curve exits from the right edge of `from` and enters the left edge of `to`.
 */
export function arrowPath(from: NodeLayout, to: NodeLayout): string {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`;
}
