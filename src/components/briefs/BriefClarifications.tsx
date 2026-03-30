// SPEC: ai-brief.md
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type { ClarificationItem } from "@/lib/ai/brief-generator";

interface BriefClarificationsProps {
  clarifications: ClarificationItem[];
  hasNewAnswers: boolean;
  allAnswered: boolean;
  refining: boolean;
  finalizing: boolean;
  onUpdateClarification: (id: string, answer: string) => void;
  onRefine: () => Promise<void>;
  onFinalize: () => Promise<void>;
}

export function BriefClarifications({
  clarifications,
  hasNewAnswers,
  allAnswered,
  refining,
  finalizing,
  onUpdateClarification,
  onRefine,
  onFinalize,
}: BriefClarificationsProps) {
  if (clarifications.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        Claude needs clarification
      </h2>

      <div className="rounded-lg border divide-y">
        {clarifications.map((c) => (
          <div key={c.id} className="px-4 py-3 space-y-2">
            <p className="text-sm font-medium">{c.question}</p>
            <Textarea
              value={c.answer ?? ""}
              onChange={(e) => onUpdateClarification(c.id, e.target.value)}
              placeholder="Your answer…"
              rows={2}
              className="text-sm"
            />
            {c.answered && (
              <p className="text-xs text-[#008146] dark:text-[#00D93A] flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Answered
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          size="sm"
          variant="outline"
          disabled={!hasNewAnswers || refining}
          onClick={onRefine}
        >
          {refining && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Refine Brief
        </Button>
        <Button
          size="sm"
          disabled={!allAnswered || finalizing}
          onClick={onFinalize}
        >
          {finalizing && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Finalize Brief
        </Button>
      </div>
    </div>
  );
}
