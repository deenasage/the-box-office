// SPEC: dependencies.md
// GET /api/tickets/dependency-graph?sprintId=... (optional)
// Returns { data: { nodes, edges } } for the dependency graph page
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { DependencyType, TicketStatus, Team } from "@prisma/client";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const sprintId = req.nextUrl.searchParams.get("sprintId");

  const deps = await db.ticketDependency.findMany({
    include: {
      fromTicket: { select: { id: true, title: true, status: true, team: true } },
      toTicket: { select: { id: true, title: true, status: true, team: true } },
    },
    where:
      sprintId
        ? {
            OR: [
              { fromTicket: { sprintId } },
              { toTicket: { sprintId } },
            ],
          }
        : undefined,
    orderBy: { createdAt: "asc" },
  });

  // Deduplicate nodes by id
  const nodeMap = new Map<string, GraphNode>();
  for (const dep of deps) {
    const ft = dep.fromTicket;
    const tt = dep.toTicket;
    if (!nodeMap.has(ft.id)) {
      nodeMap.set(ft.id, {
        id: ft.id,
        title: ft.title,
        status: ft.status,
        team: ft.team,
      });
    }
    if (!nodeMap.has(tt.id)) {
      nodeMap.set(tt.id, {
        id: tt.id,
        title: tt.title,
        status: tt.status,
        team: tt.team,
      });
    }
  }

  const nodes: GraphNode[] = Array.from(nodeMap.values());
  const edges: GraphEdge[] = deps.map((dep) => ({
    from: dep.fromTicketId,
    to: dep.toTicketId,
    type: dep.type,
  }));

  return NextResponse.json({ data: { nodes, edges } });
}
