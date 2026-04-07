// SPEC: tickets.md
// SPEC: design-improvements.md
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { X, ExternalLink, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TicketStatus, Team, TicketSize, Hub } from "@prisma/client";
import { TicketComments } from "@/components/tickets/TicketComments";
import { TicketTimeline, type TimelineEntry } from "@/components/tickets/TicketTimeline";
import { ActivityFeed } from "@/components/tickets/ActivityFeed";
import { STATUS_LABELS } from "@/lib/constants";

const STAKEHOLDER_ROLES = new Set(["MEMBER_STAKEHOLDER", "TEAM_LEAD_STAKEHOLDER"]);

// ── Static data ───────────────────────────────────────────────────────────────

const SIZE_LABELS: Record<TicketSize, string> = {
  XS: "XS (2h)", S: "S (4h)", M: "M (8h)", L: "L (20h)", XL: "XL (36h)", XXL: "XXL (72h)",
};
const PRIORITY_LABELS = ["No priority", "Low", "Medium", "High"];
const TEAM_LABELS: Record<Team, string> = {
  CONTENT: "Content", DESIGN: "Design", SEO: "SEO",
  WEM: "WEM", PAID_MEDIA: "Paid Media", ANALYTICS: "Analytics",
};
const HUB_LABELS: Record<Hub, string> = {
  NA_HUB: "NA Hub", EU_HUB: "EU Hub", UKIA_HUB: "UKIA Hub",
};
const ALL_STATUSES  = Object.values(TicketStatus);
const ALL_SIZES     = Object.values(TicketSize);
const ALL_TEAMS     = Object.values(Team);
const ALL_HUBS      = Object.values(Hub);

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PanelTicket {
  id: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  team: Team | null;
  priority: number;
  size: TicketSize | null;
  hub: Hub | null;
  tier: string | null;
  createdAt: string;
  updatedAt: string;
  assigneeId: string | null;
  assignee: { id: string; name: string } | null;
  creator: { id: string; name: string } | null;
  sprint: { id: string; name: string } | null;
  sprintId: string | null;
  epic: { id: string; name: string; color: string | null } | null;
  isCarryover: boolean;
}

interface Props {
  ticketId: string;
  onClose: () => void;
  onStatusChange: (newStatus: TicketStatus) => void;
}

// ── Inline editable field row ─────────────────────────────────────────────────

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 min-h-8">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ── Inline editable description ───────────────────────────────────────────────

function InlineDesc({
  ticketId,
  initial,
  onSaved,
}: {
  ticketId: string;
  initial: string | null;
  onSaved: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);

  async function commit() {
    const trimmed = value.trim();
    if (trimmed === (initial ?? "")) { setEditing(false); return; }
    setSaving(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: trimmed || null }),
      });
      onSaved(trimmed || null);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void commit();
            if (e.key === "Escape") { setValue(initial ?? ""); setEditing(false); }
          }}
          disabled={saving}
          rows={4}
          placeholder="Add a description..."
          className="text-sm resize-y"
        />
        <p className="text-[11px] text-muted-foreground">Cmd+Enter to save · Esc to cancel</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-start gap-2 text-left w-full rounded-md py-1 hover:bg-muted/50 transition-colors"
    >
      {value ? (
        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed flex-1">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground/60 italic flex-1">Add a description…</p>
      )}
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
    </button>
  );
}

// ── Inline editable title ─────────────────────────────────────────────────────

function InlineTitle({
  ticketId,
  initial,
  onSaved,
}: {
  ticketId: string;
  initial: string;
  onSaved: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initial) { setValue(initial); setEditing(false); return; }
    setSaving(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      onSaved(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); void commit(); }
          if (e.key === "Escape") { setValue(initial); setEditing(false); }
        }}
        disabled={saving}
        rows={2}
        className="w-full text-base font-semibold leading-snug bg-transparent border-0 border-b border-border outline-none resize-none p-0 pb-1"
        aria-label="Edit title"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-start gap-2 text-left w-full hover:bg-muted/40 rounded transition-colors px-1 -mx-1 py-0.5"
    >
      <h2 className="text-base font-semibold leading-snug flex-1">{value}</h2>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
    </button>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function KanbanTicketPanel({ ticketId, onClose, onStatusChange }: Props) {
  const [ticket, setTicket]       = useState<PanelTicket | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [currentUserId, setCurrentUserId]   = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [tierOptions, setTierOptions] = useState<string[]>([]);
  const [users, setUsers]   = useState<{ id: string; name: string }[]>([]);
  const [sprints, setSprints] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [activityKey, setActivityKey] = useState(0);

  // Timeline state
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Bootstrap: current user + list values
  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.ok ? r.json() as Promise<{ id: string; name: string; role: string }> : Promise.reject())
      .then((u) => { setCurrentUserId(u.id); setCurrentUserName(u.name); setCurrentUserRole(u.role ?? ""); })
      .catch(() => {});
    fetch("/api/list-values?key=tier")
      .then((r) => r.json())
      .then((j: { data: { value: string }[] }) => setTierOptions((j.data ?? []).map((v) => v.value)))
      .catch(() => {});
    fetch("/api/users?limit=200")
      .then((r) => r.json())
      .then((j: { data: { id: string; name: string }[] }) => setUsers(j.data ?? []))
      .catch(() => {});
    fetch("/api/sprints?limit=50")
      .then((r) => r.json())
      .then((j: { data: { id: string; name: string; isActive: boolean }[] }) => setSprints(j.data ?? []))
      .catch(() => {});
  }, []);

  // Load ticket
  useEffect(() => {
    setLoading(true);
    setError(null);
    setTicket(null);
    setTimelineEntries(null);
    fetch(`/api/tickets/${ticketId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load ticket");
        return r.json() as Promise<{ data: PanelTicket }>;
      })
      .then((json) => setTicket(json.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [ticketId]);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const loadTimeline = useCallback(() => {
    if (timelineEntries !== null || timelineLoading) return;
    setTimelineLoading(true);
    fetch(`/api/tickets/${ticketId}/status-history`)
      .then((r) => r.json() as Promise<{ data: TimelineEntry[] }>)
      .then((j) => setTimelineEntries(j.data ?? []))
      .catch(() => setTimelineEntries([]))
      .finally(() => setTimelineLoading(false));
  }, [ticketId, timelineEntries, timelineLoading]);

  async function patch(data: Record<string, unknown>) {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data: PanelTicket };
      setTicket(json.data);
      const key = Object.keys(data)[0];
      if (key === "status") onStatusChange(data.status as TicketStatus);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full z-40 w-[420px] bg-card border-l border-border shadow-xl flex flex-col",
          "animate-in slide-in-from-right duration-200"
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Ticket details"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ticket</span>
          <div className="flex items-center gap-1">
            <Link
              href={`/tickets/${ticketId}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            >
              View full screen
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose} aria-label="Close panel">
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
          {error && <p className="p-4 text-sm text-destructive">{error}</p>}

          {ticket && (() => {
            const isStakeholder = STAKEHOLDER_ROLES.has(currentUserRole);
            return (
            <Tabs defaultValue="details" className="flex flex-col flex-1 min-h-0">
              <TabsList variant="line" className="shrink-0 w-full justify-start border-b rounded-none pb-0 h-auto gap-0 px-4">
                <TabsTrigger value="details"  className="px-4 py-2 rounded-none">Details</TabsTrigger>
                <TabsTrigger value="activity" className="px-4 py-2 rounded-none">Activity</TabsTrigger>
                <TabsTrigger value="timeline" className="px-4 py-2 rounded-none" onClick={loadTimeline}>Timeline</TabsTrigger>
              </TabsList>

              {/* ── Details tab ── */}
              <TabsContent value="details" className="flex-1 overflow-y-auto p-4 space-y-5 mt-0">
                {/* Title */}
                <InlineTitle
                  ticketId={ticketId}
                  initial={ticket.title}
                  onSaved={(v) => setTicket((t) => t ? { ...t, title: v } : t)}
                />

                {/* All editable fields */}
                <div className="space-y-1.5">
                  <FieldRow label="Status">
                    <Select
                      value={ticket.status}
                      onValueChange={(v) => void patch({ status: v })}
                      disabled={saving}
                    >
                      <SelectTrigger className="h-7 text-xs border-dashed w-full">
                        <span className="truncate">{STATUS_LABELS[ticket.status]}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  <FieldRow label="Team">
                    <Select
                      value={ticket.team ?? "_none"}
                      onValueChange={(v) => void patch({ team: v === "_none" ? null : v })}
                      disabled={saving}
                    >
                      <SelectTrigger className="h-7 text-xs border-dashed w-full">
                        <span className="truncate">{ticket.team ? TEAM_LABELS[ticket.team] : "No team"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" className="text-xs text-muted-foreground">No team</SelectItem>
                        {ALL_TEAMS.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">{TEAM_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  <FieldRow label="Priority">
                    <Select
                      value={String(ticket.priority)}
                      onValueChange={(v) => void patch({ priority: Number(v) })}
                      disabled={saving}
                    >
                      <SelectTrigger className="h-7 text-xs border-dashed w-full">
                        <span className="truncate">{PRIORITY_LABELS[ticket.priority] ?? "No priority"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_LABELS.map((label, i) => (
                          <SelectItem key={i} value={String(i)} className="text-xs">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  <FieldRow label="Size">
                    <Select
                      value={ticket.size ?? "_none"}
                      onValueChange={(v) => void patch({ size: v === "_none" ? null : v })}
                      disabled={saving || isStakeholder}
                    >
                      <SelectTrigger className="h-7 text-xs border-dashed w-full">
                        <span className="truncate">{ticket.size ? SIZE_LABELS[ticket.size] : "Unsized"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" className="text-xs text-muted-foreground">Unsized</SelectItem>
                        {ALL_SIZES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{SIZE_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  <FieldRow label="Hub">
                    <Select
                      value={ticket.hub ?? "_none"}
                      onValueChange={(v) => void patch({ hub: v === "_none" ? null : v })}
                      disabled={saving}
                    >
                      <SelectTrigger className="h-7 text-xs border-dashed w-full">
                        <span className="truncate">{ticket.hub ? HUB_LABELS[ticket.hub] : "No hub"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" className="text-xs text-muted-foreground">No hub</SelectItem>
                        {ALL_HUBS.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{HUB_LABELS[h]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  {tierOptions.length > 0 && (
                    <FieldRow label="Tier">
                      <Select
                        value={ticket.tier ?? "_none"}
                        onValueChange={(v) => void patch({ tier: v === "_none" ? null : v })}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-7 text-xs border-dashed w-full">
                          <span className="truncate">{ticket.tier ?? "No tier"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none" className="text-xs text-muted-foreground">No tier</SelectItem>
                          {tierOptions.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                  )}

                  <FieldRow label="Assignee">
                    <Select
                      value={ticket.assigneeId ?? "_none"}
                      onValueChange={(v) => void patch({ assigneeId: v === "_none" ? null : v })}
                      disabled={saving || isStakeholder}
                    >
                      <SelectTrigger className="h-7 text-xs border-dashed w-full">
                        <span className="truncate">
                          {ticket.assignee?.name ?? "Unassigned"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" className="text-xs text-muted-foreground">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  <FieldRow label="Requester">
                    <span className="text-xs text-foreground">
                      {ticket.creator?.name ?? "—"}
                    </span>
                  </FieldRow>

                  <FieldRow label="Sprint">
                    <Select
                      value={ticket.sprintId ?? "_none"}
                      onValueChange={(v) => void patch({ sprintId: v === "_none" ? null : v })}
                      disabled={saving || isStakeholder}
                    >
                      <SelectTrigger className="h-7 text-xs border-dashed w-full">
                        <span className="truncate">
                          {ticket.sprint?.name ?? "No sprint"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" className="text-xs text-muted-foreground">No sprint</SelectItem>
                        {sprints.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.name}{s.isActive ? " ✓" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  {ticket.epic && (
                    <FieldRow label="Epic">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: `${ticket.epic.color ?? "#6366f1"}22`,
                          color: ticket.epic.color ?? "#6366f1",
                        }}
                      >
                        {ticket.epic.name}
                      </span>
                    </FieldRow>
                  )}

                  <FieldRow label="Created">
                    <span className="text-xs text-foreground">{formatDate(ticket.createdAt)}</span>
                  </FieldRow>
                  <FieldRow label="Updated">
                    <span className="text-xs text-foreground">{formatDate(ticket.updatedAt)}</span>
                  </FieldRow>
                </div>

                {/* Description */}
                <div className="border-t border-border pt-4 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                  <InlineDesc
                    ticketId={ticketId}
                    initial={ticket.description}
                    onSaved={(v) => setTicket((t) => t ? { ...t, description: v } : t)}
                  />
                </div>

                {/* Comments */}
                {currentUserId && (
                  <div className="border-t border-border pt-4">
                    <TicketComments
                      ticketId={ticketId}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                      onCommentAdded={() => setActivityKey((k) => k + 1)}
                    />
                  </div>
                )}
              </TabsContent>

              {/* ── Activity tab ── */}
              <TabsContent value="activity" className="flex-1 overflow-y-auto p-4 mt-0">
                <ActivityFeed ticketId={ticketId} refreshKey={activityKey} />
              </TabsContent>

              {/* ── Timeline tab ── */}
              <TabsContent value="timeline" className="flex-1 overflow-y-auto p-4 mt-0">
                {timelineLoading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                ) : timelineEntries !== null ? (
                  <TicketTimeline entries={timelineEntries} createdAt={ticket.createdAt} />
                ) : (
                  <p className="text-sm text-muted-foreground">Click to load timeline.</p>
                )}
              </TabsContent>
            </Tabs>
            );
          })()}
        </div>
      </div>
    </>
  );
}
