// SPEC: ai-estimation.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, Pencil } from "lucide-react";
import { TicketSize } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

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

const SIZE_HOURS: Record<TicketSize, number> = {
  XS: 2, S: 4, M: 8, L: 20, XL: 36, XXL: 72,
};

const ALL_SIZES = Object.keys(SIZE_HOURS) as TicketSize[];

function sizeLabel(size: TicketSize) {
  return `${size} — ${SIZE_HOURS[size]}h`;
}

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
  onAccept: (overrideSize?: TicketSize) => void;
  onDismiss: () => void;
}

export function EstimateResult({
  estimate,
  canAccept,
  accepting,
  onAccept,
  onDismiss,
}: EstimateResultProps) {
  const [overriding, setOverriding] = useState(false);
  const [overrideSize, setOverrideSize] = useState<TicketSize>(estimate.suggestedSize);

  const appliedSize = overriding ? overrideSize : estimate.suggestedSize;
  const hours = SIZE_HOURS[appliedSize];

  return (
    <div className="space-y-3 pt-1">
      {/* Size + hours + confidence row */}
      <div className="flex items-end gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Suggested size</p>
          {overriding ? (
            <Select value={overrideSize} onValueChange={(v) => setOverrideSize(v as TicketSize)}>
              <SelectTrigger className="h-8 w-36 text-sm font-mono font-semibold">
                <span>{sizeLabel(overrideSize)}</span>
              </SelectTrigger>
              <SelectContent>
                {ALL_SIZES.map((s) => (
                  <SelectItem key={s} value={s} className="font-mono text-sm">
                    {sizeLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-mono">{estimate.suggestedSize}</span>
              <span className="text-sm text-muted-foreground">{hours}h</span>
            </div>
          )}
        </div>
        <div className="flex-1 pb-1">
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
              className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded px-2 py-1.5"
            >
              <span>⚠️</span>
              <span>{typeof f === "string" ? f : f.message}</span>
            </li>
          ))}
        </ul>
      )}

      {estimate.accepted ? (
        <div className="flex items-center gap-1.5 text-xs text-[#008146] dark:text-[#00D93A]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Size applied — {SIZE_HOURS[estimate.suggestedSize]}h
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {canAccept && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAccept(overriding ? overrideSize : undefined)}
              disabled={accepting}
            >
              {accepting ? "Applying…" : `Apply ${appliedSize} (${hours}h)`}
            </Button>
          )}
          {canAccept && !overriding && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => setOverriding(true)}
            >
              <Pencil className="h-3 w-3" />
              Override
            </Button>
          )}
          {overriding && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setOverriding(false); setOverrideSize(estimate.suggestedSize); }}
            >
              Cancel override
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
