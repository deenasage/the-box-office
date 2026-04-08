// SPEC: tickets.md
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { FieldRenderer } from "@/components/forms/FieldRenderer";
import { evaluateConditions } from "@/lib/form-logic";
import { Team, TicketSize, TicketStatus, TicketType } from "@prisma/client";
import { TEAM_LABELS, STATUS_LABELS } from "@/lib/constants";
import { LayoutTemplate } from "lucide-react";
import { TicketTypeBadge, TICKET_TYPE_CONFIG } from "@/components/tickets/TicketTypeBadge";
import type { TicketTemplate } from "./TicketTemplateManager";
import type { FormFieldConfig, ConditionalRule } from "@/types";

const TEMPLATES_STORAGE_KEY = "ticket-intake:ticket-templates";

function loadStoredTemplates(): TicketTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TicketTemplate[];
  } catch {
    return [];
  }
}

interface QuickCreateTicketProps {
  sprints: { id: string; name: string }[];
  users: { id: string; name: string }[];
  onCreated: () => void;
  onCancel: () => void;
  template?: TicketTemplate;
}

const SIZE_OPTIONS: { value: TicketSize; label: string }[] = [
  { value: TicketSize.XS, label: "XS" },
  { value: TicketSize.S, label: "S" },
  { value: TicketSize.M, label: "M" },
  { value: TicketSize.L, label: "L" },
  { value: TicketSize.XL, label: "XL" },
  { value: TicketSize.XXL, label: "XXL" },
];

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: TicketStatus.BACKLOG, label: STATUS_LABELS[TicketStatus.BACKLOG] },
  { value: TicketStatus.TODO, label: STATUS_LABELS[TicketStatus.TODO] },
  { value: TicketStatus.READY, label: STATUS_LABELS[TicketStatus.READY] },
  { value: TicketStatus.IN_PROGRESS, label: STATUS_LABELS[TicketStatus.IN_PROGRESS] },
];

const TEAM_OPTIONS = (Object.keys(TEAM_LABELS) as Team[]).map((t) => ({
  value: t,
  label: TEAM_LABELS[t],
}));

interface ActiveTemplate {
  id: string;
  fields: (FormFieldConfig & { options?: string[] | null; conditions?: string | null })[];
}

export function QuickCreateTicket({
  sprints,
  users,
  onCreated,
  onCancel,
  template,
}: QuickCreateTicketProps) {
  const [title, setTitle] = useState(template?.titlePrefix ?? "");
  const [team, setTeam] = useState<Team | "">((template?.team as Team) ?? "");
  const [status, setStatus] = useState<TicketStatus>(
    (template?.status as TicketStatus) ?? TicketStatus.BACKLOG
  );
  const [assigneeId, setAssigneeId] = useState("");
  const [size, setSize] = useState(template?.size ?? "");
  const [sprintId, setSprintId] = useState("");
  const [ticketType, setTicketType] = useState<TicketType | "">("");
  const [dueDate, setDueDate] = useState("");
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [storedTemplates, setStoredTemplates] = useState<TicketTemplate[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => { setStoredTemplates(loadStoredTemplates()); }, []);

  // Fetch active intake form template
  useEffect(() => {
    fetch("/api/form-templates/active")
      .then((r) => r.json())
      .then((res: { data: ActiveTemplate | null }) => {
        if (!res.data) return;
        setTemplateId(res.data.id);
        setFormFields(
          res.data.fields.map((f) => ({
            ...f,
            options: Array.isArray(f.options) ? f.options : (typeof f.options === "string" ? (JSON.parse(f.options) as string[]) : undefined),
            conditions: f.conditions ? (JSON.parse(f.conditions as string) as ConditionalRule[]) : undefined,
          }))
        );
      })
      .catch(() => {});
  }, []);

  function setFormValue(key: string, value: unknown) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  function applyTemplate(t: TicketTemplate) {
    if (t.titlePrefix !== undefined) setTitle(t.titlePrefix);
    if (t.team) setTeam(t.team as Team);
    if (t.status) setStatus(t.status as TicketStatus);
    if (t.size) setSize(t.size);
    setShowTemplateMenu(false);
    titleRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); titleRef.current?.focus(); return; }
    if (!team) { setError("Team is required."); return; }

    // Validate visible required dynamic fields
    for (const field of formFields) {
      const { visible, required } = evaluateConditions(field, formValues);
      if (!visible || !required) continue;
      const val = formValues[field.fieldKey];
      const empty = val == null || val === "" || (Array.isArray(val) && val.length === 0);
      if (empty) { setError(`"${field.label}" is required.`); return; }
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Collect only visible dynamic field values
      const filteredData: Record<string, unknown> = {};
      for (const field of formFields) {
        const { visible } = evaluateConditions(field, formValues);
        if (visible) filteredData[field.fieldKey] = formValues[field.fieldKey] ?? "";
      }

      const body: Record<string, unknown> = {
        title: title.trim(),
        team,
        status,
        priority: 0,
        formData: JSON.stringify(filteredData),
      };
      if (ticketType) body.type = ticketType;
      if (assigneeId) body.assigneeId = assigneeId;
      if (size) body.size = size;
      if (sprintId) body.sprintId = sprintId;
      if (dueDate) body.dueDate = dueDate;
      if (templateId) body.templateId = templateId;

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Failed to create ticket.");
        return;
      }

      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
      aria-label="Create ticket"
      className="bg-muted/30 border rounded-lg p-4 space-y-4"
      noValidate
    >
      {/* Stored templates picker */}
      {storedTemplates.length > 0 && (
        <div className="relative">
          <Button type="button" size="sm" variant="outline"
            onClick={() => setShowTemplateMenu((v) => !v)}
            aria-expanded={showTemplateMenu} className="h-7 text-xs gap-1" disabled={isSubmitting}
          >
            <LayoutTemplate className="h-3 w-3" aria-hidden="true" />
            Templates
          </Button>
          {showTemplateMenu && (
            <div role="listbox" aria-label="Pick a template"
              className="absolute left-0 top-full mt-1 z-20 bg-popover border rounded-lg shadow-md py-1 min-w-40 max-h-48 overflow-y-auto"
            >
              {storedTemplates.map((t) => (
                <button key={t.id} type="button" role="option" aria-selected={false}
                  onClick={() => applyTemplate(t)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="qc-title" className="text-xs font-medium">
          Title <span aria-hidden="true" className="text-destructive">*</span>
        </Label>
        <Input
          id="qc-title" ref={titleRef} value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ticket title…" className="h-8 text-sm"
          required aria-required="true" disabled={isSubmitting}
        />
      </div>

      {/* Team + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="qc-team" className="text-xs font-medium">
            Team <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Select value={team || "_none"} onValueChange={(v) => setTeam(v === "_none" ? "" : v as Team)} disabled={isSubmitting}>
            <SelectTrigger id="qc-team" className="h-8 text-xs">
              <span className="flex-1 text-left truncate">
                {team ? (TEAM_LABELS[team] ?? team) : "Select team"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {TEAM_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="qc-status" className="text-xs font-medium">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)} disabled={isSubmitting}>
            <SelectTrigger id="qc-status" className="h-8 text-xs">
              <span className="flex-1 text-left truncate">
                {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}
              </span>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Type */}
      <div className="space-y-1">
        <Label htmlFor="qc-type" className="text-xs font-medium">Type</Label>
        <Select value={ticketType || "_none"} onValueChange={(v) => setTicketType(v === "_none" ? "" : v as TicketType)} disabled={isSubmitting}>
          <SelectTrigger id="qc-type" className="h-8 text-xs">
            <span className="flex-1 text-left truncate flex items-center gap-1.5">
              {ticketType ? (
                <TicketTypeBadge type={ticketType} variant="full" />
              ) : (
                "No type"
              )}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none" className="text-xs text-muted-foreground">No type</SelectItem>
            {(Object.values(TicketType) as TicketType[]).map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                <TicketTypeBadge type={t} variant="full" />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic intake form fields */}
      {formFields.length > 0 && (
        <div className="space-y-4 pt-1 border-t border-border">
          {formFields.map((field) => {
            const { visible, required } = evaluateConditions(field, formValues);
            if (!visible) return null;
            return (
              <FieldRenderer
                key={field.id}
                field={field}
                value={formValues[field.fieldKey]}
                onChange={(v) => setFormValue(field.fieldKey, v)}
                required={required}
              />
            );
          })}
        </div>
      )}

      {/* Assignee + Size */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="qc-assignee" className="text-xs font-medium">Assignee</Label>
          <Select value={assigneeId || "_none"} onValueChange={(v) => setAssigneeId(v === "_none" ? "" : (v ?? ""))} disabled={isSubmitting}>
            <SelectTrigger id="qc-assignee" className="h-8 text-xs">
              <span className="flex-1 text-left truncate">
                {assigneeId ? (users.find((u) => u.id === assigneeId)?.name ?? "Unassigned") : "Unassigned"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" className="text-xs">Unassigned</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="qc-size" className="text-xs font-medium">Size</Label>
          <Select value={size || "_none"} onValueChange={(v) => setSize(v === "_none" ? "" : (v ?? ""))} disabled={isSubmitting}>
            <SelectTrigger id="qc-size" className="h-8 text-xs">
              <span className="flex-1 text-left truncate">
                {size ? (SIZE_OPTIONS.find((o) => o.value === size)?.label ?? size) : "No size"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" className="text-xs">No size</SelectItem>
              {SIZE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sprint */}
      {sprints.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="qc-sprint" className="text-xs font-medium">Sprint</Label>
          <Select value={sprintId || "_none"} onValueChange={(v) => setSprintId(v === "_none" ? "" : (v ?? ""))} disabled={isSubmitting}>
            <SelectTrigger id="qc-sprint" className="h-8 text-xs">
              <span className="flex-1 text-left truncate">
                {sprintId ? (sprints.find((s) => s.id === sprintId)?.name ?? "No sprint") : "No sprint"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" className="text-xs">No sprint</SelectItem>
              {sprints.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Due date */}
      <div className="space-y-1">
        <Label htmlFor="qc-due" className="text-xs font-medium">Due date</Label>
        <input
          id="qc-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={isSubmitting}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Due date"
        />
      </div>

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" className="h-7 text-xs px-3" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create"}
        </Button>
        <button type="button" onClick={onCancel} disabled={isSubmitting}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
