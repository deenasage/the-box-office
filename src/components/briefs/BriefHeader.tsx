// SPEC: ai-brief.md
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";
import { BriefStatus } from "@prisma/client";
import { STATUS_BADGE_STYLES as STATUS_STYLES } from "@/lib/constants";

interface BriefHeaderBrief {
  title: string;
  status: BriefStatus;
  creator: { id: string; name: string };
  epic?: { id: string; name: string } | null;
}

interface BriefHeaderProps {
  brief: BriefHeaderBrief;
}

export function BriefHeader({ brief }: BriefHeaderProps) {
  return (
    <>
      <Link
        href="/briefs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Briefs
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{brief.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{brief.creator.name}</span>
            {brief.epic && (
              <>
                <span>·</span>
                <span className="text-foreground">{brief.epic.name}</span>
              </>
            )}
          </div>
        </div>
        <Badge variant="outline" className={STATUS_STYLES[brief.status]}>
          {brief.status.charAt(0) + brief.status.slice(1).toLowerCase()}
        </Badge>
      </div>
    </>
  );
}
