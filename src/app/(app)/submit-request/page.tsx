// SPEC: guest-intake.md
// SPEC: ai-brief.md
// In-app Submit Request page — intake form + saved briefs/drafts in one place.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BriefStatus, UserRole } from "@prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IntakeFormClient } from "@/app/intake/IntakeFormClient";
import { SubmitRequestShareBar } from "./SubmitRequestShareBar";
import { formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";
import { STATUS_BADGE_STYLES as STATUS_STYLES } from "@/lib/constants";
import type { FormFieldConfig, ConditionalRule } from "@/types";

export const metadata = {
  title: "Submit a Request | The Box Office",
  description: "Submit a new request or view your saved submissions.",
};

const TABS = [
  { key: "new", label: "New Request" },
  { key: "submissions", label: "My Submissions" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default async function SubmitRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const { tab, status } = await searchParams;
  const activeTab: Tab = tab === "submissions" ? "submissions" : "new";

  const session = await auth();
  const isAdmin =
    session?.user.role === UserRole.ADMIN ||
    session?.user.role === UserRole.TEAM_LEAD;

  // Fetch based on active tab
  const [template, briefs] = await Promise.all([
    activeTab === "new"
      ? db.formTemplate.findFirst({
          where: { isActive: true },
          include: { fields: { orderBy: { order: "asc" } } },
        })
      : Promise.resolve(null),
    activeTab === "submissions"
      ? db.brief.findMany({
          where: {
            ...(isAdmin ? {} : { creatorId: session?.user.id }),
            status:
              status && status !== "ALL"
                ? (status as BriefStatus)
                : { not: BriefStatus.ARCHIVED },
          },
          include: {
            creator: { select: { name: true } },
            epic: { select: { name: true } },
            _count: { select: { tickets: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submit Request</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a new request or view your saved submissions.
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

      {/* ── My Submissions tab ── */}
      {activeTab === "submissions" && briefs !== null && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {(["ALL", "DRAFT", "REVIEW", "FINALIZED"] as const).map((s) => (
              <Link
                key={s}
                href={s === "ALL" ? "/submit-request?tab=submissions" : `/submit-request?tab=submissions&status=${s}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  (s === "ALL" && !status) || status === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </Link>
            ))}
          </div>

          {briefs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No submissions yet</p>
                <p className="text-sm text-muted-foreground">
                  Submissions you create will appear here.
                </p>
              </div>
              <Link href="/submit-request?tab=new">
                <Button size="sm">Submit a request</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {briefs.map((brief) => (
                <Link key={brief.id} href={`/briefs/${brief.id}`}>
                  <Card className="hover:shadow-md hover:ring-1 hover:ring-primary/20 transition-all cursor-pointer">
                    <CardContent className="py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{brief.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {brief.creator.name} &middot; {formatDate(brief.createdAt)}
                          {brief.epic && ` · ${brief.epic.name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {brief._count.tickets > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {brief._count.tickets} ticket{brief._count.tickets !== 1 ? "s" : ""}
                          </span>
                        )}
                        <Badge variant="outline" className={STATUS_STYLES[brief.status]}>
                          {brief.status.charAt(0) + brief.status.slice(1).toLowerCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
