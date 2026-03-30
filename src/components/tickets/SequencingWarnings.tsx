// SPEC: tickets.md
"use client";

import { AlertTriangle } from "lucide-react";
import { SequencingWarning } from "@/lib/dependencies";

interface SequencingWarningsProps {
  warnings: SequencingWarning[];
}

export function SequencingWarnings({ warnings }: SequencingWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <>
      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 text-amber-700 text-xs"
        >
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{w.message}</span>
        </div>
      ))}
    </>
  );
}
