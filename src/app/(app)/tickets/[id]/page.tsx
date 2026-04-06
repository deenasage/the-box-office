// SPEC: tickets.md
// SPEC: skillsets.md
// SPEC: brief-to-epic-workflow.md
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { SizeBadge } from "@/components/tickets/SizeBadge";
import { formatDate } from "@/lib/utils";
import { TicketActions } from "@/components/tickets/TicketActions";
import { TicketDetailEditor } from "@/components/tickets/TicketDetailEditor";
import { AIEstimatePanel } from "@/components/tickets/AIEstimatePanel";
import { DependencySection } from "@/components/tickets/DependencySection";
import { LabelSelector } from "@/components/tickets/LabelSelector";
import { DueDateField } from "@/components/tickets/DueDateField";
import { TicketActivityTabs } from "@/components/tickets/TicketActivityTabs";
import { SkillsetBadge } from "@/components/skillsets/SkillsetBadge";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { STATUS_LABELS, STATUS_BADGE_STYLES as STATUS_STYLES, PRIORITY_LABELS } from "@/lib/constants";

const PRIORITY_COLORS = ["text-muted-foreground", "text-yellow-600", "text-orange-600", "text-red-600"];

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
      sprint: { select: { id: true, name: true } },
      epic: { select: { id: true, name: true, color: true } },
      brief: { select: { id: true, title: true } },
      labels: { select: { label: { select: { id: true, name: true, color: true } } } },
      requiredSkillset: { select: { id: true, name: true, color: true } },
      template: {
        select: {
          id: true,
          name: true,
          fields: { select: { fieldKey: true, label: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!ticket) notFound();

  // Parse formData JSON safely
  let formData: Record<string, unknown> = {};
  try {
    formData = JSON.parse(ticket.formData) as Record<string, unknown>;
  } catch {
    formData = {};
  }

  const [users, sprints, statusHistory] = await Promise.all([
    db.user.findMany({
      select: { id: true, name: true, team: true },
      orderBy: { name: "asc" },
    }),
    db.sprint.findMany({
      select: { id: true, name: true, isActive: true },
      orderBy: { startDate: "desc" },
    }),
    db.ticketStatusHistory.findMany({
      where: { ticketId: id },
      orderBy: { changedAt: "asc" },
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        changedAt: true,
        changedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href={`/tickets?ticket=${ticket.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      {/* Title + badges */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <TeamBadge team={ticket.team} />
          <Badge variant="outline" className={STATUS_STYLES[ticket.status]}>
            {STATUS_LABELS[ticket.status]}
          </Badge>
          <SizeBadge size={ticket.size} />
          {ticket.requiredSkillset && (
            <SkillsetBadge
              name={ticket.requiredSkillset.name}
              color={ticket.requiredSkillset.color}
            />
          )}
          {ticket.priority > 0 && (
            <span className={`text-xs font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
              ▲ {PRIORITY_LABELS[ticket.priority]}
            </span>
          )}
        </div>
        <TicketDetailEditor
          ticketId={ticket.id}
          initialTitle={ticket.title}
          initialDescription={ticket.description}
          formData={formData}
          templateFields={ticket.template?.fields}
        />
      </div>

      <TicketActions
        ticket={{
          ...ticket,
          requiredSkillsetId: ticket.requiredSkillsetId ?? null,
          assigneeName: ticket.assignee?.name ?? null,
          sprintName: ticket.sprint?.name ?? null,
        }}
        users={users}
        sprints={sprints}
      />

      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Labels</p>
        <LabelSelector ticketId={ticket.id} currentLabels={ticket.labels.map((l) => l.label)} />
      </div>

      {session && (
        <AIEstimatePanel
          ticketId={ticket.id}
          currentSize={ticket.size}
          userRole={session.user.role}
        />
      )}

      {session && (
        <DependencySection
          ticketId={ticket.id}
          userRole={session.user.role ?? "MEMBER_CRAFT"}
        />
      )}

      <div className="rounded-lg border bg-muted/30 divide-y text-sm">
        <div className="grid grid-cols-2 divide-x">
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Creator</p>
            <p className="font-medium">{ticket.creator.name}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Assignee</p>
            {ticket.assignee ? (
              <p className="font-medium">{ticket.assignee.name}</p>
            ) : (
              <p className="text-muted-foreground">Unassigned</p>
            )}
          </div>
        </div>
        {(ticket.sprint || ticket.epic) && (
          <div className="grid grid-cols-2 divide-x">
            {ticket.sprint ? (
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Sprint</p>
                <Link href={`/sprints/${ticket.sprint.id}`} className="font-medium hover:text-primary hover:underline transition-colors">
                  {ticket.sprint.name}
                </Link>
              </div>
            ) : <div />}
            {ticket.epic ? (
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Epic</p>
                <span className="font-medium" style={{ color: ticket.epic.color }}>
                  {ticket.epic.name}
                </span>
              </div>
            ) : <div />}
          </div>
        )}
        {ticket.brief && (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Source Brief</p>
            <Link
              href={`/briefs/${ticket.brief.id}`}
              className="font-medium hover:text-primary hover:underline transition-colors"
            >
              {ticket.brief.title}
            </Link>
          </div>
        )}
        <div className="grid grid-cols-2 divide-x">
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Created</p>
            <p className="font-medium">{formatDate(ticket.createdAt)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Updated</p>
            <p className="font-medium">{formatDate(ticket.updatedAt)}</p>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground mb-0.5">Due date</p>
          <DueDateField
            ticketId={ticket.id}
            dueDate={ticket.dueDate ? ticket.dueDate.toISOString() : null}
            status={ticket.status}
          />
        </div>
      </div>

      {/* Activity, Comments & Time tabs */}
      {session && (
        <TicketActivityTabs
          ticketId={ticket.id}
          currentUserId={session.user.id}
          currentUserName={session.user.name}
          currentUserRole={session.user.role}
          timelineEntries={statusHistory.map((e) => ({
            id: e.id,
            fromStatus: e.fromStatus,
            toStatus: e.toStatus,
            changedAt: e.changedAt.toISOString(),
            changedBy: e.changedBy,
          }))}
          createdAt={ticket.createdAt.toISOString()}
        />
      )}
    </div>
  );
}
