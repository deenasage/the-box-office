// SPEC: gtm-brief-generator.md
"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { GtmBriefData } from "@/components/briefs/brief-types";

// ── Field definition ──────────────────────────────────────────────────────────

export interface GtmFieldDef {
  label: string;
  key: keyof GtmBriefData;
}

// ── Inline editable field ─────────────────────────────────────────────────────

interface GtmFieldProps {
  label: string;
  value: string | null;
  onSave: (value: string) => void;
  readOnly?: boolean;
}

function GtmField({ label, value, onSave, readOnly = false }: GtmFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function handleSave() {
    setEditing(false);
    onSave(draft);
  }

  function handleCancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  return (
    <div className="py-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {!editing && !readOnly && (
          <button
            type="button"
            aria-label={`Edit ${label}`}
            onClick={() => { setDraft(value ?? ""); setEditing(true); }}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-1.5">
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="text-sm resize-y"
            aria-label={`Edit ${label}`}
          />
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-7 px-2 text-xs"
              onClick={handleSave}
              aria-label="Save"
            >
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleCancel}
              aria-label="Cancel"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {value?.trim() ? value : <span className="text-muted-foreground">&mdash;</span>}
        </p>
      )}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

interface GtmBriefSectionProps {
  title: string;
  fields: GtmFieldDef[];
  data: GtmBriefData;
  onFieldSave: (key: keyof GtmBriefData, value: string) => void;
  readOnly?: boolean;
}

export function GtmBriefSection({
  title,
  fields,
  data,
  onFieldSave,
  readOnly = false,
}: GtmBriefSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 divide-y">
        {fields.map(({ label, key }) => (
          <GtmField
            key={key}
            label={label}
            value={data[key]}
            onSave={(v) => onFieldSave(key, v)}
            readOnly={readOnly}
          />
        ))}
      </CardContent>
    </Card>
  );
}
