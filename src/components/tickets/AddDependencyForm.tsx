// SPEC: tickets.md
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { DependencyType } from "@prisma/client";
import { DEP_TYPE_LABELS } from "@/components/tickets/DependencyRow";

// ─── TicketSearchInput ────────────────────────────────────────────────────────

interface TicketSearchResult {
  id: string;
  title: string;
  status: string;
}

interface TicketSearchInputProps {
  value: string;
  onSelect: (id: string, title: string) => void;
}

function TicketSearchInput({ value, onSelect }: TicketSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [allTickets, setAllTickets] = useState<TicketSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  // Fetch all tickets once on mount and cache them in state.
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function loadAll() {
      try {
        const res = await fetch("/api/tickets?limit=200");
        if (!res.ok) return;
        const data = (await res.json()) as
          | { data?: TicketSearchResult[]; tickets?: TicketSearchResult[] }
          | TicketSearchResult[];
        const list: TicketSearchResult[] = Array.isArray(data)
          ? data
          : (data as { data?: TicketSearchResult[] }).data ??
            (data as { tickets?: TicketSearchResult[] }).tickets ??
            [];
        setAllTickets(list);
      } finally {
        setLoading(false);
      }
    }

    void loadAll();
  }, []);

  // Derived filtered list — client-side, instant, no network call.
  const filtered = query.trim()
    ? allTickets.filter((t) =>
        t.title.toLowerCase().includes(query.trim().toLowerCase())
      )
    : allTickets;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
  }

  function handleSelect(ticket: TicketSearchResult) {
    setQuery(ticket.title);
    setOpen(false);
    onSelect(ticket.id, ticket.title);
  }

  return (
    <div className="relative flex-1 min-w-0">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search tickets..."
        aria-label="Search tickets"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full text-sm border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring pr-6"
      />
      {loading && (
        <Loader2 className="absolute right-1.5 top-1.5 h-3 w-3 animate-spin text-muted-foreground" />
      )}
      {open && !loading && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 left-0 right-0 bg-popover border border-border rounded-md shadow-lg text-sm max-h-52 overflow-y-auto divide-y divide-border"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground text-xs select-none">
              No tickets found
            </li>
          ) : (
            filtered.map((t) => (
              <li
                key={t.id}
                role="option"
                aria-selected={false}
                className="px-3 py-2 cursor-pointer hover:bg-muted/60 flex items-center justify-between gap-3"
                onMouseDown={() => handleSelect(t)}
              >
                <span className="truncate">{t.title}</span>
                <span className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wide">
                  {t.status}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ─── AddDependencyForm ────────────────────────────────────────────────────────

interface AddDependencyFormProps {
  ticketId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddDependencyForm({
  ticketId,
  onSuccess,
  onCancel,
}: AddDependencyFormProps) {
  const [toTicketId, setToTicketId] = useState("");
  const [type, setType] = useState<DependencyType>("BLOCKS");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toTicketId.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toTicketId: toTicketId.trim(), type }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to add dependency.");
      } else {
        onSuccess();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="px-3 py-3 border-t space-y-2 bg-muted/20"
    >
      <p className="text-xs font-semibold text-muted-foreground">
        Add Dependency
      </p>
      <div className="flex gap-2 flex-wrap">
        <TicketSearchInput value="" onSelect={(id) => setToTicketId(id)} />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DependencyType)}
          aria-label="Dependency type"
          className="text-sm border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {(Object.keys(DEP_TYPE_LABELS) as DependencyType[]).map((t) => (
            <option key={t} value={t}>
              {DEP_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          className="h-7 text-xs"
          disabled={submitting || !toTicketId.trim()}
        >
          {submitting ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : null}
          Add
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
