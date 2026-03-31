// SPEC: ai-brief.md
// SPEC: gtm-brief-generator.md
// SPEC: design-improvements.md
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BriefStatus, UserRole } from "@prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Plus, FileText } from "lucide-react";
import { STATUS_BADGE_STYLES as STATUS_STYLES } from "@/lib/constants";

function BriefTypeBadge({ briefType }: { briefType: string | null }) {
  if (briefType === "GTM") {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-medium">
        GTM
      </Badge>
    );
  }
  if (briefType) {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-medium">
        {briefType.replace(/_/g, " ")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs font-medium">
      Generic
    </Badge>
  );
}

export default async function BriefsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const { status } = await searchParams;

  const isAdmin =
    session?.user.role === UserRole.ADMIN ||
    session?.user.role === UserRole.TEAM_LEAD;

  const briefs = await db.brief.findMany({
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
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Briefs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Project intake briefs, AI-generated from your submissions
          </p>
        </div>
        <Link href="/briefs/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Brief
          </Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "DRAFT", "REVIEW", "FINALIZED"] as const).map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/briefs" : `/briefs?status=${s}`}
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
            <p className="text-sm font-medium">No briefs yet</p>
            <p className="text-sm text-muted-foreground">
              Briefs are AI-generated project summaries created from intake submissions.
            </p>
          </div>
          <Link href="/briefs/new">
            <Button size="sm">Create your first brief</Button>
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
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {brief._count.tickets > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {brief._count.tickets} ticket{brief._count.tickets !== 1 ? "s" : ""}
                      </span>
                    )}
                    <BriefTypeBadge briefType={brief.briefType} />
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
  );
}
