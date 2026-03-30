// SPEC: ai-brief.md
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { BriefStatus } from "@prisma/client";
import { parseJsonSafe } from "@/lib/utils";

// ── InlineEdit ────────────────────────────────────────────────────────────────

interface InlineEditProps {
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  disabled?: boolean;
}

function InlineEdit({ value, onSave, multiline = true, disabled = false }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <p
        className={`text-sm text-foreground whitespace-pre-wrap ${
          disabled ? "" : "cursor-text hover:bg-muted/50 rounded px-1 -mx-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        }`}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? undefined : 0}
        aria-label="Click to edit"
        onClick={() => !disabled && setEditing(true)}
        onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) setEditing(true); }}
      >
        {value || <span className="text-muted-foreground italic">Click to edit</span>}
      </p>
    );
  }

  return multiline ? (
    <Textarea
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); onSave(draft); }}
      className="text-sm"
      rows={3}
    />
  ) : (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); onSave(draft); }}
      className="text-sm w-full border rounded px-2 py-1 bg-background"
    />
  );
}

// ── BriefFields ───────────────────────────────────────────────────────────────

interface BriefFieldsData {
  status: BriefStatus;
  objective?: string | null;
  targetAudience?: string | null;
  timeline?: string | null;
  deliverables?: string | null;
  dependencies?: string | null;
  requiredTeams?: string | null;
  successMetrics?: string | null;
}

interface BriefFieldsProps {
  brief: BriefFieldsData;
  isEditable: boolean;
  onSaveSection: (field: string, value: string | string[]) => Promise<void>;
}

const TEXT_FIELDS = [
  { label: "Objective",       field: "objective"     },
  { label: "Target Audience", field: "targetAudience" },
  { label: "Timeline",        field: "timeline"      },
] as const;

const LIST_FIELDS = [
  { label: "Deliverables",    field: "deliverables"   },
  { label: "Dependencies",    field: "dependencies"   },
  { label: "Success Metrics", field: "successMetrics" },
] as const;

export function BriefFields({ brief, isEditable, onSaveSection }: BriefFieldsProps) {
  const deliverables   = parseJsonSafe<string[]>(brief.deliverables, []);
  const dependencies   = parseJsonSafe<string[]>(brief.dependencies, []);
  const requiredTeams  = parseJsonSafe<string[]>(brief.requiredTeams, []);
  const successMetrics = parseJsonSafe<string[]>(brief.successMetrics, []);

  const listValues: Record<string, string[]> = { deliverables, dependencies, successMetrics };

  return (
    <div className="rounded-lg border divide-y text-sm">
      {TEXT_FIELDS.map(({ label, field }) => (
        <div key={field} className="px-4 py-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <InlineEdit
            value={(brief[field as keyof BriefFieldsData] as string) ?? ""}
            onSave={(v) => onSaveSection(field, v)}
            disabled={!isEditable}
          />
        </div>
      ))}

      {LIST_FIELDS.map(({ label, field }) => {
        const items = listValues[field] ?? [];
        return (
          <div key={field} className="px-4 py-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            {items.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5">
                {items.map((item, i) => <li key={i} className="text-sm">{item}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">None specified</p>
            )}
          </div>
        );
      })}

      <div className="px-4 py-3 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required Teams</p>
        <div className="flex flex-wrap gap-1.5">
          {requiredTeams.length > 0 ? (
            requiredTeams.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">Not determined</p>
          )}
        </div>
      </div>
    </div>
  );
}
