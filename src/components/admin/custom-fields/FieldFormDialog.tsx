// SPEC: custom-fields.md
"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DropdownOptions } from "./DropdownOptions";
import type { CustomField, CustomFieldDraft } from "./types";

const FIELD_TYPES = ["TEXT", "NUMBER", "SELECT", "DATE", "CHECKBOX"] as const;
const TEAM_SCOPES = ["GLOBAL", "CONTENT", "DESIGN", "SEO", "WEM"] as const;

interface Props {
  open: boolean;
  field: CustomField | null;
  onClose: () => void;
  onSave: (draft: CustomFieldDraft, id?: string) => Promise<void>;
}

export function FieldFormDialog({ open, field, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState("TEXT");
  const [teamScope, setTeamScope] = useState("GLOBAL");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (open) {
      setName(field?.name ?? "");
      setFieldType(field?.fieldType ?? "TEXT");
      setTeamScope(field?.teamScope ?? "GLOBAL");
      setRequired(field?.required ?? false);
      setOptions(field?.options ?? []);
      setNameError("");
    }
  }, [open, field]);

  function addOption(opt: string) {
    if (!options.includes(opt)) setOptions((p) => [...p, opt]);
  }
  function removeOption(opt: string) {
    setOptions((p) => p.filter((o) => o !== opt));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError("Name is required"); return; }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        fieldType,
        teamScope: teamScope === "GLOBAL" ? null : teamScope,
        required,
        options,
      }, field?.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{field ? "Edit Field" : "Add Custom Field"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-name">Name <span aria-hidden="true">*</span></Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(""); }}
              placeholder="e.g. Campaign URL"
              aria-required="true"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "cf-name-error" : undefined}
            />
            {nameError && (
              <p id="cf-name-error" className="text-xs text-destructive">{nameError}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-type">Field Type</Label>
            <Select value={fieldType} onValueChange={(v) => { if (v) setFieldType(v); }}>
              <SelectTrigger id="cf-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-scope">Team Scope</Label>
            <Select value={teamScope} onValueChange={(v) => { if (v) setTeamScope(v); }}>
              <SelectTrigger id="cf-scope" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SCOPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="cf-required" className="cursor-pointer">Required</Label>
            <Switch id="cf-required" checked={required} onCheckedChange={setRequired} />
          </div>

          {fieldType === "SELECT" && (
            <DropdownOptions options={options} onAdd={addOption} onRemove={removeOption} />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
