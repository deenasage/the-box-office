// SPEC: ai-estimation.md
"use client";

import { Button } from "@/components/ui/button";
import { SizeBadge } from "@/components/tickets/SizeBadge";
import { CheckCircle2, X } from "lucide-react";
import { TicketSize } from "@prisma/client";
import { cn } from "@/lib/utils";

export interface EstimationFlag {
  type: string;
  message: string;
}

export interface AIEstimate {
  id: string;
  suggestedSize: TicketSize;
  confidence: number;
  rationale: string;
  flags: EstimationFlag[];
  accepted: boolean;
  acceptedAt: string | null;
  createdAt: string;
}

const FLAG_ICONS: Record<string, string> = {
  AMBIGUOUS_SCOPE: "⚠️",
  LIKELY_UNDERESTIMATED: "📈",
  NO_SIMILAR_TICKETS: "🔍",
  MISSING_DESCRIPTION: "📝",
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.7 ? "bg-[#008146] dark:bg-[#00D93A]" : value >= 0.4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

interface EstimateResultProps {
  estimate: AIEstimate;
  canAccept: boolean;
  accepting: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

export function EstimateResult({
  estimate,
  canAccept,
  accepting,
  onAccept,
  onDismiss,
}: EstimateResultProps) {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Suggested size</p>
          <SizeBadge size={estimate.suggestedSize} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Confidence</p>
          <ConfidenceBar value={estimate.confidence} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{estimate.rationale}</p>

      {estimate.flags.length > 0 && (
        <ul className="space-y-1">
          {estimate.flags.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5"
            >
              <span>{FLAG_ICONS[f.type] ?? "⚠️"}</span>
              <span>{f.message}</span>
            </li>
          ))}
        </ul>
      )}

      {estimate.accepted ? (
        <div className="flex items-center gap-1.5 text-xs text-[#008146] dark:text-[#00D93A]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Size applied
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-1">
          {canAccept && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={onAccept}
              disabled={accepting}
            >
              {accepting ? "Applying…" : `Apply ${estimate.suggestedSize}`}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={onDismiss}
          >
            <X className="h-3 w-3 mr-1" />
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
