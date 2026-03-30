// SPEC: tickets.md
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketMetadataPanelProps {
  formData: Record<string, unknown>;
  templateFields?: { fieldKey: string; label: string }[];
}

function labelFor(key: string, templateFields?: { fieldKey: string; label: string }[]): string {
  const field = templateFields?.find((f) => f.fieldKey === key);
  return field?.label ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayValue(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export function TicketMetadataPanel({ formData, templateFields }: TicketMetadataPanelProps) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(formData).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

  if (entries.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        <span>Submission details</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 border-t text-sm bg-muted/20">
          {entries.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{labelFor(k, templateFields)}</dt>
              <dd className="font-medium">{displayValue(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
