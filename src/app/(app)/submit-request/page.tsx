// SPEC: guest-intake.md
// SPEC: ai-brief.md
// In-app Submit Request page — intake form + brief drafts + my tickets in one place.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BriefStatus, TicketStatus, UserRole } from "@prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IntakeFormClient } from "@/app/intake/IntakeFormClient";
import { SubmitRequestShareBar } from "./SubmitRequestShareBar";
import { BriefDraftsClient, BriefDraftsFilterPills } from "./BriefDraftsClient";
import { TicketCard } from "@/components/tickets/TicketCard";
import { TrendingUp, Ticket } from "lucide-react";
import { STATUS_LABELS, STATUS_BADGE_STYLES } from "@/lib/constants";
import type { FormFieldConfig, ConditionalRule } from "@/types";

export const metadata = {
  title: "Submit a Request | The Box Office",
  description: "Submit a new request or view your saved submissions.",
};

const TABS = [
  { key: "new",         label: "New Request" },
  { key: "drafts",      label: "Brief Drafts" },
  { key: "submissions", label: "My Submissions" },
] as const;

type Tab = (typeof TABS)[number]["key"];

// Ordered list of statuses to group tickets under in My Submissions
const TICKET_STATUS_ORDER: TicketStatus[] = [
  TicketStatus.IN_PROGRESS,
  TicketStatus.IN_REVIEW,
  TicketStatus.READY,
  TicketStatus.TODO,
  TicketStatus.BACKLOG,
  TicketStatus.BLOCKED,
  TicketStatus.DONE,
];

// Statuses included in the Brief Drafts tab
const DRAFT_TAB_STATUSES: BriefStatus[] = [
  BriefStatus.DRAFT,
  BriefStatus.GENERATING,
  BriefStatus.REVIEW,
  BriefStatus.APPROVED,
];

export default async function SubmitRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const { tab, status } = await searchParams;

  const activeTab: Tab =
    tab === "drafts"      ? "drafts" :
    tab === "submissions" ? "submissions" :
    "new";

  const session = await auth();
  const isAdmin =
    session?.user.role === UserRole.ADMIN ||
    session?.user.role === UserRole.TEAM_LEAD;

  // Derive the brief status filter for the drafts tab.
  // Filter pills use "REVIEW" as the URL param but it maps to the REVIEW enum value.
  // "ALL" (or absent) means all DRAFT_TAB_STATUSES.
  const draftsStatusFilter: BriefStatus | undefined =
    activeTab === "drafts" && status && status !== "ALL" && DRAFT_TAB_STATUSES.includes(status as BriefStatus)
      ? (status as BriefStatus)
      : undefined;

  // Fetch data for the active tab only
  const [template, briefs, tickets] = await Promise.all([
    // New Request tab: load active form template
    activeTab === "new"
      ? db.formTemplate.findFirst({
          where: { isActive: true },
          include: { fields: { orderBy: { order: "asc" } } },
        })
      : Promise.resolve(null),

    // Brief Drafts tab: load non-archived briefs
    activeTab === "drafts"
      ? db.brief.findMany({
          where: {
            ...(isAdmin ? {} : { creatorId: session?.user.id }),
            status: draftsStatusFilter
              ? draftsStatusFilter
              : { in: DRAFT_TAB_STATUSES },
          },
          include: {
            creator: { select: { name: true } },
            _count: { select: { shareTokens: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),

    // My Submissions tab: tickets created by this user
    activeTab === "submissions" && session?.user.id
      ? db.ticket.findMany({
          where: { creatorId: session.user.id },
          include: {
            assignee: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
  ]);

  // Group tickets by status for the My Submissions view
  type TicketItem = NonNullable<typeof tickets>[number];
  const ticketsByStatus =
    tickets !== null
      ? TICKET_STATUS_ORDER.reduce<Record<TicketStatus, TicketItem[]>>((acc, s) => {
          acc[s] = tickets.filter((t) => t.status === s);
          return acc;
        }, {} as Record<TicketStatus, TicketItem[]>)
      : null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submit Request</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a new request, review brief drafts, or check your submitted tickets.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/submit-request?tab=${key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── New Request tab ── */}
      {activeTab === "new" && (
        <div className="space-y-6">
          {/* GTM Brief shortcut */}
          <Link href="/briefs/new">
            <Card className="hover:shadow-md hover:ring-1 hover:ring-green-500/30 transition-all cursor-pointer border-green-200 bg-green-50/40 dark:bg-green-900/10">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="rounded-md bg-green-100 dark:bg-green-900/30 p-2.5 shrink-0">
                  <TrendingUp className="h-5 w-5 text-green-700 dark:text-green-400" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-200">Create a GTM Brief</p>
                  <p className="text-xs text-green-700/70 dark:text-green-400/70 mt-0.5">
                    Upload a PDF or Word doc — Claude extracts all structured fields automatically
                  </p>
                </div>
                <span className="text-xs font-medium text-green-700 dark:text-green-400 shrink-0">Open →</span>
              </CardContent>
            </Card>
          </Link>

          <SubmitRequestShareBar />

          {!template ? (
            <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No intake form is currently active. Please check back later or contact
              the team directly.
            </div>
          ) : (
            <IntakeFormClient
              fields={template.fields.map((f): FormFieldConfig => ({
                id: f.id,
                label: f.label,
                fieldKey: f.fieldKey,
                type: f.type,
                required: f.required,
                order: f.order,
                options: f.options
                  ? (JSON.parse(f.options) as string[])
                  : undefined,
                conditions: f.conditions
                  ? (JSON.parse(f.conditions) as ConditionalRule[])
                  : undefined,
              }))}
              templateId={template.id}
              formName={template.name}
              formDescription={template.description}
            />
          )}
        </div>
      )}

      {/* ── Brief Drafts tab ── */}
      {activeTab === "drafts" && briefs !== null && (
        <div className="space-y-4">
          <BriefDraftsFilterPills activeStatus={status} />
          <BriefDraftsClient
            initialBriefs={briefs.map((b) => ({
              id: b.id,
              title: b.title,
              status: b.status,
              createdAt: b.createdAt,
              creator: b.creator,
              _count: { shareTokens: b._count.shareTokens },
            }))}
            activeStatus={status}
          />
        </div>
      )}

      {/* ── My Submissions tab ── */}
      {activeTab === "submissions" && tickets !== null && ticketsByStatus !== null && (
        <div className="space-y-6">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
              <Ticket className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No tickets yet</p>
                <p className="text-sm text-muted-foreground">
                  Tickets created from your requests will appear here.
                </p>
              </div>
              <Link href="/submit-request?tab=new">
                <Button size="sm">Submit a request</Button>
              </Link>
            </div>
          ) : (
            TICKET_STATUS_ORDER.filter((s) => ticketsByStatus[s].length > 0).map((s) => (
              <div key={s} className="space-y-2">
                {/* Status group heading */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${STATUS_BADGE_STYLES[s]}`}
                  >
                    {STATUS_LABELS[s]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {ticketsByStatus[s].length} ticket{ticketsByStatus[s].length !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Ticket cards */}
                <div className="grid gap-2">
                  {ticketsByStatus[s].map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      id={ticket.id}
                      title={ticket.title}
                      team={ticket.team}
                      size={ticket.size}
                      priority={ticket.priority}
                      status={ticket.status}
                      assignee={ticket.assignee}
                      dueDate={ticket.dueDate}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
