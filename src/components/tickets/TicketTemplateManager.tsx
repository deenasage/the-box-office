// SPEC: tickets.md
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Team, TicketSize, TicketStatus } from "@prisma/client";
import { TEAM_LABELS } from "@/lib/constants";
import { ChevronDown, ChevronRight, LayoutTemplate, Plus, X } from "lucide-react";

const STORAGE_KEY = "ticket-intake:ticket-templates";

export interface TicketTemplate {
  id: string;
  name: string;
  team?: string;
  status?: string;
  size?: string;
  titlePrefix?: string;
  description?: string;
  createdAt: string;
}

interface TicketTemplateManagerProps {
  onUse: (template: TicketTemplate) => void;
}

const TEAM_OPTIONS = (Object.keys(TEAM_LABELS) as Team[]).map((t) => ({
  value: t,
  label: TEAM_LABELS[t],
}));

const SIZE_OPTIONS: { value: TicketSize; label: string }[] = [
  { value: TicketSize.XS, label: "XS" },
  { value: TicketSize.S, label: "S" },
  { value: TicketSize.M, label: "M" },
  { value: TicketSize.L, label: "L" },
  { value: TicketSize.XL, label: "XL" },
  { value: TicketSize.XXL, label: "XXL" },
];

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: TicketStatus.BACKLOG, label: "Backlog" },
  { value: TicketStatus.TODO, label: "Prioritized" },
  { value: TicketStatus.IN_PROGRESS, label: "In Progress" },
];

function loadTemplates(): TicketTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TicketTemplate[];
  } catch {
    return [];
  }
}

function persistTemplates(templates: TicketTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

const EMPTY_FORM = {
  name: "",
  team: "",
  status: "",
  size: "",
  titlePrefix: "",
  description: "",
};

export function TicketTemplateManager({ onUse }: TicketTemplateManagerProps) {
  const [expanded, setExpanded] = useState(false);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  function handleSave() {
    if (!form.name.trim()) return;
    const t: TicketTemplate = {
      id: Date.now().toString(),
      name: form.name.trim(),
      team: form.team || undefined,
      status: form.status || undefined,
      size: form.size || undefined,
      titlePrefix: form.titlePrefix || undefined,
      description: form.description || undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...templates, t];
    setTemplates(updated);
    persistTemplates(updated);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    persistTemplates(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setShowForm(false);
      setForm(EMPTY_FORM);
    }
  }

  return (
    <div className="border rounded-lg bg-muted/20 text-sm">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={expanded}
        aria-controls="template-manager-body"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <LayoutTemplate className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Templates</span>
        {templates.length > 0 && (
          <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0">
            {templates.length}
          </span>
        )}
      </button>

      {expanded && (
        <div id="template-manager-body" className="px-3 pb-3 space-y-2">
          {/* Saved template chips */}
          {templates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="inline-flex items-center gap-1 bg-background border rounded-full px-2.5 py-1 text-xs"
                >
                  <span className="font-medium max-w-[100px] truncate" title={t.name}>
                    {t.name}
                  </span>
                  {t.team && (
                    <span className="text-muted-foreground">
                      · {TEAM_LABELS[t.team as Team] ?? t.team}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onUse(t)}
                    className="ml-1 text-primary hover:underline outline-none focus-visible:underline"
                    aria-label={`Use template: ${t.name}`}
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    className="rounded-full hover:bg-muted p-0.5 transition-colors"
                    aria-label={`Delete template: ${t.name}`}
                  >
                    <X className="h-2.5 w-2.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {templates.length === 0 && !showForm && (
            <p className="text-xs text-muted-foreground">
              No templates yet. Create one to pre-fill quick-create fields.
            </p>
          )}

          {/* New template form */}
          {showForm ? (
            <div
              className="bg-background border rounded-lg p-3 space-y-2"
              onKeyDown={handleKeyDown}
            >
              <div className="space-y-1">
                <Label htmlFor="tmpl-name" className="text-xs font-medium">
                  Template name <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="tmpl-name"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. SEO Audit"
                  className="h-7 text-xs"
                  maxLength={60}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="tmpl-team" className="text-xs font-medium">Team</Label>
                  <Select
                    value={form.team || "_none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, team: v === "_none" ? "" : (v ?? "") }))}
                  >
                    <SelectTrigger id="tmpl-team" className="h-7 text-xs" aria-label="Select team">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="text-xs">Any</SelectItem>
                      {TEAM_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tmpl-status" className="text-xs font-medium">Status</Label>
                  <Select
                    value={form.status || "_none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v === "_none" ? "" : (v ?? "") }))}
                  >
                    <SelectTrigger id="tmpl-status" className="h-7 text-xs" aria-label="Select status">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="text-xs">Any</SelectItem>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="tmpl-size" className="text-xs font-medium">Size</Label>
                  <Select
                    value={form.size || "_none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, size: v === "_none" ? "" : (v ?? "") }))}
                  >
                    <SelectTrigger id="tmpl-size" className="h-7 text-xs" aria-label="Select size">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="text-xs">Any</SelectItem>
                      {SIZE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tmpl-prefix" className="text-xs font-medium">Title prefix</Label>
                  <Input
                    id="tmpl-prefix"
                    value={form.titlePrefix}
                    onChange={(e) => setForm((f) => ({ ...f, titlePrefix: e.target.value }))}
                    placeholder="e.g. [SEO] "
                    className="h-7 text-xs"
                    maxLength={30}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tmpl-desc" className="text-xs font-medium">Description</Label>
                <Input
                  id="tmpl-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional default description…"
                  className="h-7 text-xs"
                  maxLength={200}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!form.name.trim()}
                  className="h-7 text-xs px-3"
                >
                  Save template
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(EMPTY_FORM);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="h-7 text-xs gap-1"
              aria-label="Create new ticket template"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              New template
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
