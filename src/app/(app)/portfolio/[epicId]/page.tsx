// SPEC: portfolio-view.md
// SPEC: design-improvements.md
import { notFound } from "next/navigation";
import { isTeamLead } from "@/lib/role-helpers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { InitiativeDetail } from "@/components/portfolio/InitiativeDetail";
import { PortfolioDetail } from "@/components/portfolio/portfolio-types";
import { UserRole, TicketStatus, Team } from "@prisma/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Map as MapIcon, FileSpreadsheet } from "lucide-react";
import { EpicEditButton } from "@/components/epics/EpicEditButton";
import { EpicGanttChart } from "@/components/gantt/EpicGanttChart";
import { SIZE_HOURS } from "@/lib/utils";

interface PageProps {
  params: Promise<{ epicId: string }>;
}

export default async function InitiativeDetailPage({ params }: PageProps) {
  const { epicId } = await params;
  const session = await auth();

  const epic = await db.epic.findUnique({
    where: { id: epicId },
    include: {
      roadmapItem: { select: { id: true } },
      briefs: {
        include: {
          creator: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      tickets: {
        select: {
          id: true,
          title: true,
          status: true,
          size: true,
          team: true,
          sprintId: true,
          briefId: true,
          sprint: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          assignee: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!epic) notFound();

  // Group tickets by team
  type TicketRow = {
    id: string;
    title: string;
    status: string;
    size: string | null;
    sprintId: string | null;
    sprintName: string | null;
    assigneeName: string | null;
    briefId: string | null;
  };
  const teamMap = new Map<Team, TicketRow[]>();
  for (const ticket of epic.tickets) {
    const rows = teamMap.get(ticket.team) ?? [];
    rows.push({
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      size: ticket.size,
      sprintId: ticket.sprintId,
      sprintName: ticket.sprint?.name ?? null,
      assigneeName: ticket.assignee?.name ?? null,
      briefId: ticket.briefId ?? null,
    });
    teamMap.set(ticket.team, rows);
  }

  const ticketsByTeam = Array.from(teamMap.entries()).map(([team, tickets]) => {
    const committedPoints = tickets.reduce(
      (sum, t) => sum + (t.size ? SIZE_HOURS[t.size as keyof typeof SIZE_HOURS] ?? 0 : 0),
      0
    );
    const completedPoints = tickets
      .filter((t) => t.status === TicketStatus.DONE)
      .reduce(
        (sum, t) => sum + (t.size ? SIZE_HOURS[t.size as keyof typeof SIZE_HOURS] ?? 0 : 0),
        0
      );
    return { team, tickets, committedPoints, completedPoints };
  });

  // Compute sprint timeline bounds
  const ticketsWithSprint = epic.tickets.filter(
    (t): t is typeof t & { sprint: NonNullable<(typeof t)["sprint"]> } => t.sprint !== null
  );
  const startDates = ticketsWithSprint.map((t) => t.sprint.startDate.getTime());
  const endDates = ticketsWithSprint.map((t) => t.sprint.endDate.getTime());

  const earliestSprintStart =
    startDates.length > 0 ? new Date(Math.min(...startDates)).toISOString() : null;
  const latestSprintEnd =
    endDates.length > 0 ? new Date(Math.max(...endDates)).toISOString() : null;

  const data: PortfolioDetail = {
    epic: {
      id: epic.id,
      name: epic.name,
      description: epic.description,
      team: epic.team,
      status: epic.status,
      color: epic.color,
      startDate: epic.startDate ? epic.startDate.toISOString() : null,
      endDate: epic.endDate ? epic.endDate.toISOString() : null,
    },
    briefs: epic.briefs.map((b) => ({
      id: b.id,
      title: b.title,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      creatorName: b.creator.name,
    })),
    ticketsByTeam,
    timeline: { earliestSprintStart, latestSprintEnd },
  };
  const canSync =
    session?.user.role === UserRole.ADMIN ||
    isTeamLead(session?.user.role as UserRole);
  const canEdit = canSync;

  return (
    <>
      <div className="px-6 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/portfolio">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Projects
            </Button>
          </Link>
          {epic.roadmapItem && (
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MapIcon className="h-3 w-3" />
              View on Roadmap
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/portfolio/${epicId}/document`}>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Project Document
            </Button>
          </Link>
          {canEdit && (
            <EpicEditButton
              epic={{
                id: data.epic.id,
                name: data.epic.name,
                color: data.epic.color,
                startDate: data.epic.startDate ?? null,
                endDate: data.epic.endDate ?? null,
                team: (data.epic.team as Team) ?? null,
              }}
            />
          )}
        </div>
      </div>
      <InitiativeDetail data={data} canSync={canSync} />
      <div className="px-6 pb-8 space-y-3">
        <div className="flex items-center gap-3 pt-2">
          <h2 className="text-lg font-semibold shrink-0">Timeline</h2>
          <div className="flex-1 border-t border-border" />
        </div>
        <EpicGanttChart
          epicId={epicId}
          epicStartDate={data.epic.startDate}
          epicEndDate={data.epic.endDate}
          canEdit={canEdit}
        />
      </div>
    </>
  );
}
