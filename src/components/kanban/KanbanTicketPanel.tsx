// SPEC: tickets.md
// SPEC: design-improvements.md
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TicketStatus, Team, TicketSize, Hub } from "@prisma/client";
import { TicketComments } from "@/components/tickets/TicketComments";
import { TicketTimeline, type TimelineEntry } from "@/components/tickets/TicketTimeline";

interface PanelTicket {
  id: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  isCarryover: boolean;
  status: TicketStatus;
  team: Team | null;
  priority: number;
  size: TicketSize | null;
  hub: Hub | null;
  tier: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string; email: string } | null;
  sprint: { id: string; name: string } | null;
  epic: { id: string; name: string; color: string | null } | null;
}

// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
const STATUS_STYLES: Record<TicketStatus, string> = {
  BACKLOG:     "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  TODO:        "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20",
  READY:       "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20",
  IN_PROGRESS: "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20",
  IN_REVIEW:   "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20",
  BLOCKED:     "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20",
  DONE:        "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  BACKLOG:     "Backlog",
  TODO:        "Prioritized",
  READY:       "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW:   "In Review",
  BLOCKED:     "Blocked",
  DONE:        "Done",
};

const ALL_STATUSES = Object.values(TicketStatus);

const TEAM_STYLES: Record<Team, string> = {
  CONTENT:    "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20",
  DESIGN:     "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20",
  SEO:        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20",
  WEM:        "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/20",
  PAID_MEDIA: "bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-500/20",
  ANALYTICS:  "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-500/20",
};

const SIZE_LABELS: Record<TicketSize, string> = {
  XS: "XS", S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL",
};

const HUB_LABELS: Record<Hub, string> = {
  NA_HUB: "NA Hub", EU_HUB: "EU Hub", UKIA_HUB: "UKIA Hub",
};
const ALL_HUBS = Object.values(Hub);

const PRIORITY_LABELS = ["Low", "Normal", "High", "Critical"];
const PRIORITY_STYLES = [
  "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20",
  "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20",
  "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20",
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

interface Props {
  ticketId: string;
  onClose: () => void;
  onStatusChange: (newStatus: TicketStatus) => void;
}

export function KanbanTicketPanel({ ticketId, onClose, onStatusChange }: Props) {
  const [ticket, setTicket] = useState<PanelTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [acDraft, setAcDraft] = useState<string>("");
  const [carryoverSaving, setCarryoverSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [tierOptions, setTierOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.ok ? r.json() as Promise<{ id: string; name: string; email: string }> : Promise.reject())
      .then((user) => { setCurrentUserId(user.id); setCurrentUserName(user.name); })
      .catch(() => {});
    fetch("/api/list-values?key=tier")
      .then((r) => r.json())
      .then((j: { data: { value: string }[] }) => setTierOptions((j.data ?? []).map((v) => v.value)))
      .catch(() => {});
    fetch("/api/list-values?key=category")
      .then((r) => r.json())
      .then((j: { data: { value: string }[] }) => setCategoryOptions((j.data ?? []).map((v) => v.value)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setTicket(null);
    fetch(`/api/tickets/${ticketId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load ticket");
        return r.json() as Promise<{ data: PanelTicket }>;
      })
      .then((json) => {
        setTicket(json.data);
        setAcDraft(json.data.acceptanceCriteria ?? "");
        // isCarryover is initialized from the fetched ticket; local state tracks it via setTicket
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [ticketId]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleStatusChange(newStatus: TicketStatus) {
    if (!ticket || saving || newStatus === ticket.status) return;
    setSaving(true);
    const prev = ticket.status;
    // Optimistically update local panel state
    setTicket((t) => t ? { ...t, status: newStatus } : t);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setTicket((t) => t ? { ...t, status: prev } : t);
      } else {
        // Also update the board column
        onStatusChange(newStatus);
      }
    } catch {
      setTicket((t) => t ? { ...t, status: prev } : t);
    } finally {
      setSaving(false);
    }
  }

  async function handleAcBlur() {
    if (!ticket) return;
    const value = acDraft;
    const prev = ticket.acceptanceCriteria ?? "";
    if (value === prev) return;
    setTicket((t) => t ? { ...t, acceptanceCriteria: value || null } : t);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptanceCriteria: value || null }),
      });
    } catch {
      // Revert on network error
      setAcDraft(prev);
      setTicket((t) => t ? { ...t, acceptanceCriteria: prev || null } : t);
    }
  }

  function loadTimeline() {
    if (timelineEntries !== null || timelineLoading) return;
    setTimelineLoading(true);
    fetch(`/api/tickets/${ticketId}/status-history`)
      .then((r) => r.json() as Promise<{ data: TimelineEntry[] }>)
      .then((j) => setTimelineEntries(j.data ?? []))
      .catch(() => setTimelineEntries([]))
      .finally(() => setTimelineLoading(false));
  }

  async function handleCarryoverChange(checked: boolean) {
    if (!ticket || carryoverSaving) return;
    const prev = ticket.isCarryover;
    // Optimistic update
    setTicket((t) => t ? { ...t, isCarryover: checked } : t);
    setCarryoverSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCarryover: checked }),
      });
      if (!res.ok) {
        // Revert on server error
        setTicket((t) => t ? { ...t, isCarryover: prev } : t);
      }
    } catch {
      // Revert on network error
      setTicket((t) => t ? { ...t, isCarryover: prev } : t);
    } finally {
      setCarryoverSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop — click outside closes panel */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full z-40 w-96 bg-card border-l border-border shadow-xl flex flex-col",
          "animate-in slide-in-from-right duration-200"
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Ticket details"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-foreground">Ticket details</span>
          <div className="flex items-center gap-1">
            <Link
              href={`/tickets/${ticketId}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            >
              View full screen
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onClose}
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {loading && (
            <div className="p-4 space-y-3 animate-pulse">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          )}

          {error && (
            <p className="p-4 text-sm text-destructive">{error}</p>
          )}

          {ticket && (
            <Tabs defaultValue="details" className="flex flex-col flex-1 min-h-0">
              <TabsList variant="line" className="shrink-0 w-full justify-start border-b rounded-none pb-0 h-auto gap-0 px-4">
                <TabsTrigger value="details"  className="px-4 py-2 rounded-none">Details</TabsTrigger>
                <TabsTrigger value="timeline" className="px-4 py-2 rounded-none" onClick={loadTimeline}>Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
              {/* Title */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Details</p>
                <h2 className="text-base font-semibold leading-snug text-foreground">
                  {ticket.title}
                </h2>
              </div>

              {/* Quick status change */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                <Select
                  value={ticket.status}
                  onValueChange={(v) => void handleStatusChange(v as TicketStatus)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-8 text-xs w-44" aria-label="Change status">
                    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", STATUS_STYLES[ticket.status])}>
                      {STATUS_LABELS[ticket.status]}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", STATUS_STYLES[s])}>
                          {STATUS_LABELS[s]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-1.5">
                <Badge className={cn("text-xs", STATUS_STYLES[ticket.status])}>
                  {STATUS_LABELS[ticket.status]}
                </Badge>
                {ticket.team && (
                  <Badge className={cn("text-xs", TEAM_STYLES[ticket.team])}>
                    {ticket.team}
                  </Badge>
                )}
                <Badge className={cn("text-xs", PRIORITY_STYLES[ticket.priority])}>
                  {PRIORITY_LABELS[ticket.priority] ?? `P${ticket.priority}`}
                </Badge>
                {ticket.size && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {SIZE_LABELS[ticket.size]}
                  </Badge>
                )}
              </div>

              {/* Meta fields */}
              <dl className="space-y-2 text-sm">
                {ticket.assignee && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-20 shrink-0">Assignee</dt>
                    <dd className="text-foreground">{ticket.assignee.name}</dd>
                  </div>
                )}
                {ticket.sprint && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-20 shrink-0">Sprint</dt>
                    <dd className="text-foreground">{ticket.sprint.name}</dd>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <dt className="text-muted-foreground w-20 shrink-0">Hub</dt>
                  <dd>
                    <Select
                      value={ticket.hub ?? "_none"}
                      onValueChange={(v) => {
                        const hub = v === "_none" ? null : v as Hub;
                        setTicket((t) => t ? { ...t, hub } : t);
                        void fetch(`/api/tickets/${ticketId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ hub }),
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-32 border-dashed">
                        <span className="truncate">{ticket.hub ? HUB_LABELS[ticket.hub] : "No hub"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" className="text-xs text-muted-foreground">No hub</SelectItem>
                        {ALL_HUBS.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{HUB_LABELS[h]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </dd>
                </div>
                {tierOptions.length > 0 && (
                  <div className="flex gap-2 items-center">
                    <dt className="text-muted-foreground w-20 shrink-0">Tier</dt>
                    <dd>
                      <Select
                        value={ticket.tier ?? "_none"}
                        onValueChange={(v) => {
                          const tier = v === "_none" ? null : v;
                          setTicket((t) => t ? { ...t, tier } : t);
                          void fetch(`/api/tickets/${ticketId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ tier }),
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-32 border-dashed">
                          <span className="truncate">{ticket.tier ?? "No tier"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none" className="text-xs text-muted-foreground">No tier</SelectItem>
                          {tierOptions.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </dd>
                  </div>
                )}
                {categoryOptions.length > 0 && (
                  <div className="flex gap-2 items-center">
                    <dt className="text-muted-foreground w-20 shrink-0">Category</dt>
                    <dd>
                      <Select
                        value={ticket.category ?? "_none"}
                        onValueChange={(v) => {
                          const category = v === "_none" ? null : v;
                          setTicket((t) => t ? { ...t, category } : t);
                          void fetch(`/api/tickets/${ticketId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ category }),
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-32 border-dashed">
                          <span className="truncate">{ticket.category ?? "No category"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none" className="text-xs text-muted-foreground">No category</SelectItem>
                          {categoryOptions.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </dd>
                  </div>
                )}
                {ticket.epic && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-20 shrink-0">Epic</dt>
                    <dd>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: `${ticket.epic.color ?? "#6366f1"}22`,
                          color: ticket.epic.color ?? "#6366f1",
                        }}
                      >
                        {ticket.epic.name}
                      </span>
                    </dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-20 shrink-0">Created</dt>
                  <dd className="text-foreground">{formatDate(ticket.createdAt)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-20 shrink-0">Updated</dt>
                  <dd className="text-foreground">{formatDate(ticket.updatedAt)}</dd>
                </div>
              </dl>

              {/* Description */}
              {ticket.description && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Description
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>
              )}

              {/* Definition of Done */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Definition of Done
                </p>
                <Textarea
                  value={acDraft}
                  onChange={(e) => setAcDraft(e.target.value)}
                  onBlur={() => void handleAcBlur()}
                  placeholder="List the conditions that must be met for this ticket to be considered done…"
                  className="min-h-20 resize-y text-sm"
                />
              </div>

              {/* Carryover — only shown for IN_PROGRESS tickets */}
              {ticket.status === TicketStatus.IN_PROGRESS && (
                <div className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={`carryover-${ticketId}`}
                    checked={ticket.isCarryover}
                    onCheckedChange={(checked) => void handleCarryoverChange(checked === true)}
                    disabled={carryoverSaving}
                    aria-describedby={`carryover-${ticketId}-hint`}
                  />
                  <Label
                    htmlFor={`carryover-${ticketId}`}
                    className="text-sm cursor-pointer select-none"
                  >
                    Carryover
                  </Label>
                  <span
                    id={`carryover-${ticketId}-hint`}
                    className="text-xs text-muted-foreground"
                    title="Mark this ticket as carried over from the previous sprint"
                  >
                    Mark this ticket as carried over from the previous sprint
                  </span>
                </div>
              )}

              {/* Comments */}
              {currentUserId && (
                <>
                  <Separator />
                  <TicketComments
                    ticketId={ticketId}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                  />
                </>
              )}
              </TabsContent>

              <TabsContent value="timeline" className="flex-1 overflow-y-auto p-4 mt-0">
                {timelineLoading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                ) : timelineEntries !== null ? (
                  <TicketTimeline
                    entries={timelineEntries}
                    createdAt={ticket.createdAt}
                  />
                ) : null}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
}
