// SPEC: brief-to-epic-workflow.md
// Phase 3 — PM review of AI-suggested epic + ticket split before confirmation
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, X, Plus } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SplitSuggestion {
  epic: {
    title: string;
    description: string;
    estimatedStartDate?: string;
    estimatedEndDate?: string;
  };
  tickets: Array<{
    tempId: string;
    title: string;
    description: string;
    team: string;
    storyPoints: number;
    priority: string;
    dependsOn: string[];
  }>;
}

interface Props {
  briefId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: SplitSuggestion | null;
  loading: boolean;
  onConfirm: (edited: SplitSuggestion) => void;
  confirming: boolean;
}

// ── Color maps ─────────────────────────────────────────────────────────────────
// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20

const TEAM_COLORS: Record<string, string> = {
  CONTENT: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20",
  DESIGN:  "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20",
  SEO:     "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20",
  WEM:     "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20",
  HIGH:   "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/20",
  URGENT: "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20",
};

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

// ── TicketRow ──────────────────────────────────────────────────────────────────

interface TicketRowProps {
  ticket: SplitSuggestion["tickets"][number];
  onChange: (updated: SplitSuggestion["tickets"][number]) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function TicketRow({ ticket, onChange, onRemove, canRemove }: TicketRowProps) {
  function set<K extends keyof typeof ticket>(key: K, value: (typeof ticket)[K]) {
    onChange({ ...ticket, [key]: value });
  }

  return (
    <div className="group flex items-start gap-2 rounded-md border bg-background px-3 py-2">
      <div className="flex-1 min-w-0 space-y-1.5">
        <Input
          value={ticket.title}
          onChange={(e) => set("title", e.target.value)}
          className="h-7 text-sm font-medium border-transparent bg-transparent px-0 focus-visible:border-input focus-visible:bg-background focus-visible:px-2"
          aria-label="Ticket title"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={TEAM_COLORS[ticket.team] ?? "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20"}
          >
            {ticket.team}
          </Badge>

          {/* Story points — Fibonacci select */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">pts</span>
            <select
              value={ticket.storyPoints}
              onChange={(e) => set("storyPoints", Number(e.target.value))}
              className="h-7 rounded border border-border bg-background text-xs px-1 focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Story points"
            >
              {[1, 2, 3, 5, 8, 13].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Priority — native select keeps rows lean */}
          <select
            value={ticket.priority}
            onChange={(e) => set("priority", e.target.value)}
            className={`h-5 rounded border-0 px-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer ${
              PRIORITY_COLORS[ticket.priority] ?? "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20"
            }`}
            aria-label="Priority"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {ticket.dependsOn.length > 0 && (
            <span className="text-xs text-muted-foreground">
              depends on {ticket.dependsOn.join(", ")}
            </span>
          )}
        </div>
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Remove ticket"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── TeamGroup ──────────────────────────────────────────────────────────────────

interface TeamGroupProps {
  team: string;
  tickets: SplitSuggestion["tickets"];
  onChangeTicket: (tempId: string, updated: SplitSuggestion["tickets"][number]) => void;
  onRemoveTicket: (tempId: string) => void;
  onAddTicket: (team: string) => void;
}

function TeamGroup({ team, tickets, onChangeTicket, onRemoveTicket, onAddTicket }: TeamGroupProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge className={TEAM_COLORS[team] ?? "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20"}>
          {team}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-1.5 pl-1">
        {tickets.map((t) => (
          <TicketRow
            key={t.tempId}
            ticket={t}
            onChange={(updated) => onChangeTicket(t.tempId, updated)}
            onRemove={() => onRemoveTicket(t.tempId)}
            canRemove={tickets.length >= 2}
          />
        ))}
        <button
          type="button"
          onClick={() => onAddTicket(team)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
        >
          <Plus className="h-3 w-3" aria-hidden />
          Add ticket
        </button>
      </div>
    </div>
  );
}

// ── EpicForm ───────────────────────────────────────────────────────────────────

interface EpicFormProps {
  epic: SplitSuggestion["epic"];
  onChange: <K extends keyof SplitSuggestion["epic"]>(
    key: K,
    value: SplitSuggestion["epic"][K]
  ) => void;
}

function EpicForm({ epic, onChange }: EpicFormProps) {
  const missingStart = !epic.estimatedStartDate;
  return (
    <section aria-labelledby="epic-heading">
      <h2 id="epic-heading" className="mb-3 text-sm font-semibold text-foreground">
        Epic
      </h2>
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="space-y-1">
          <label htmlFor="epic-title" className="text-xs font-medium text-muted-foreground">
            Title
          </label>
          <Input
            id="epic-title"
            value={epic.title}
            onChange={(e) => onChange("title", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="epic-desc" className="text-xs font-medium text-muted-foreground">
            Description
          </label>
          <Textarea
            id="epic-desc"
            value={epic.description}
            onChange={(e) => onChange("description", e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="epic-start" className="text-xs font-medium text-muted-foreground">
              Start date
            </label>
            <Input
              id="epic-start"
              type="date"
              value={epic.estimatedStartDate ?? ""}
              onChange={(e) => onChange("estimatedStartDate", e.target.value || undefined)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="epic-end" className="text-xs font-medium text-muted-foreground">
              End date
            </label>
            <Input
              id="epic-end"
              type="date"
              value={epic.estimatedEndDate ?? ""}
              onChange={(e) => onChange("estimatedEndDate", e.target.value || undefined)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        {missingStart && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            No start date — will default to today
          </div>
        )}
      </div>
    </section>
  );
}

// ── TeamSplitReviewModal ───────────────────────────────────────────────────────

export function TeamSplitReviewModal({
  briefId: _briefId,
  open,
  onOpenChange,
  suggestion,
  loading,
  onConfirm,
  confirming,
}: Props) {
  const [edited, setEdited] = useState<SplitSuggestion | null>(null);

  useEffect(() => {
    if (suggestion) {
      setEdited(JSON.parse(JSON.stringify(suggestion)) as SplitSuggestion);
    }
  }, [suggestion]);

  function setEpicField<K extends keyof SplitSuggestion["epic"]>(
    key: K,
    value: SplitSuggestion["epic"][K]
  ) {
    if (!edited) return;
    setEdited({ ...edited, epic: { ...edited.epic, [key]: value } });
  }

  function handleChangeTicket(tempId: string, updated: SplitSuggestion["tickets"][number]) {
    if (!edited) return;
    setEdited({ ...edited, tickets: edited.tickets.map((t) => (t.tempId === tempId ? updated : t)) });
  }

  function handleRemoveTicket(tempId: string) {
    if (!edited) return;
    setEdited({ ...edited, tickets: edited.tickets.filter((t) => t.tempId !== tempId) });
  }

  function handleAddTicket(team: string) {
    if (!edited) return;
    const blank: SplitSuggestion["tickets"][number] = {
      tempId: `t${Date.now()}`,
      title: "",
      description: "",
      team,
      storyPoints: 3,
      priority: "MEDIUM",
      dependsOn: [],
    };
    setEdited({ ...edited, tickets: [...edited.tickets, blank] });
  }

  // Group tickets by team, preserving first-occurrence insertion order
  const teamOrder: string[] = [];
  const byTeam: Record<string, SplitSuggestion["tickets"]> = {};
  for (const t of edited?.tickets ?? []) {
    if (!byTeam[t.team]) { teamOrder.push(t.team); byTeam[t.team] = []; }
    byTeam[t.team].push(t);
  }

  const teamCount = teamOrder.length;
  const ticketCount = edited?.tickets.length ?? 0;
  const totalPoints = edited?.tickets.reduce((s, t) => s + t.storyPoints, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Tickets from Brief</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            <p className="text-sm">Claude is analyzing the brief&hellip;</p>
          </div>
        )}

        {!loading && edited && (
          <div className="space-y-6">
            <EpicForm epic={edited.epic} onChange={setEpicField} />

            <section aria-labelledby="tickets-heading">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 id="tickets-heading" className="text-sm font-semibold text-foreground">
                  Proposed Tickets ({ticketCount})
                </h2>
                <span className="text-xs text-muted-foreground">
                  You can edit titles and details before confirming
                </span>
              </div>
              {ticketCount === 0 ? (
                <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  All tickets removed.
                </p>
              ) : (
                <div className="space-y-4">
                  {teamOrder.map((team) => (
                    <TeamGroup
                      key={team}
                      team={team}
                      tickets={byTeam[team]}
                      onChangeTicket={handleChangeTicket}
                      onRemoveTicket={handleRemoveTicket}
                      onAddTicket={handleAddTicket}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <DialogFooter className="mt-2">
          <p className="mr-auto text-xs text-muted-foreground self-center">
            {ticketCount} ticket{ticketCount !== 1 ? "s" : ""} · {teamCount}{" "}
            team{teamCount !== 1 ? "s" : ""} · {totalPoints} story point{totalPoints !== 1 ? "s" : ""}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || confirming || !edited}
            onClick={() => edited && onConfirm(edited)}
          >
            {confirming && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />}
            Confirm &amp; Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
