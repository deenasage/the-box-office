// SPEC: portfolio-view.md
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { PortfolioDetailBrief } from "./portfolio-types";
import { FileText } from "lucide-react";

interface BriefsSectionProps {
  briefs: PortfolioDetailBrief[];
}

const BRIEF_STATUS_STYLES: Record<string, string> = {
  DRAFT:      "bg-muted text-muted-foreground border-border",
  GENERATING: "bg-sky-50 text-sky-700 border-sky-200",
  REVIEW:     "bg-amber-50 text-amber-700 border-amber-200",
  FINALIZED:  "bg-[#008146]/10 text-[#008146] border-[#008146]/30",
  ARCHIVED:   "bg-slate-50 text-slate-500 border-slate-200",
};

export function BriefsSection({ briefs }: BriefsSectionProps) {
  if (briefs.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center text-muted-foreground border rounded-lg">
        <FileText className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No briefs yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-y border rounded-lg overflow-hidden">
      {briefs.map((brief) => (
        <div key={brief.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <Badge
              variant="outline"
              className={`text-xs shrink-0 ${BRIEF_STATUS_STYLES[brief.status] ?? ""}`}
            >
              {brief.status}
            </Badge>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{brief.title}</p>
              <p className="text-xs text-muted-foreground">
                {brief.creatorName} · {formatDate(brief.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {brief.status === "FINALIZED" && (
              <span className="text-xs text-[#008146] dark:text-[#00D93A] font-medium">(tickets generated)</span>
            )}
            <Link href={`/briefs/${brief.id}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">View Brief</Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
