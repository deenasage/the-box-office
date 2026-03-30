// SPEC: ai-brief.md
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, CheckCircle2, Ticket } from "lucide-react";
import { BriefStatus } from "@prisma/client";
import { notify } from "@/lib/toast";

interface BriefStatusBannerProps {
  briefId: string;
  status: BriefStatus;
  canEdit: boolean;
  onStatusChange: (next: BriefStatus) => void;
}

/**
 * Renders one of three status-driven banners:
 *   GENERATING — spinner while Claude works
 *   DRAFT      — "Generate Brief with Claude" trigger button
 *   FINALIZED  — "Generate Tickets" CTA
 * Returns null for any other status.
 */
export function BriefStatusBanner({
  briefId,
  status,
  canEdit,
  onStatusChange,
}: BriefStatusBannerProps) {
  if (status === BriefStatus.GENERATING) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-6 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm font-medium">Claude is analyzing your request…</p>
      </div>
    );
  }

  if (status === BriefStatus.DRAFT && canEdit) {
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-4 space-y-2">
        <p className="text-sm text-muted-foreground">
          This brief hasn&apos;t been generated yet.
        </p>
        <Button
          size="sm"
          onClick={async () => {
            const res = await fetch(`/api/briefs/${briefId}/generate`, {
              method: "POST",
            });
            if (res.ok) onStatusChange(BriefStatus.GENERATING);
            else notify.error("Generation failed — please try again.");
          }}
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          Generate Brief with Claude
        </Button>
      </div>
    );
  }

  if (status === BriefStatus.FINALIZED) {
    return (
      <div className="rounded-lg border border-[#008146]/30 bg-[#008146]/8 px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[#008146] dark:text-[#00D93A]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Brief finalized — ready for ticket generation
          </p>
        </div>
        <Link href={`/briefs/${briefId}/tickets`}>
          <Button size="sm" className="shrink-0">
            <Ticket className="h-4 w-4 mr-1.5" />
            Generate Tickets
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}
