// SPEC: labels.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useState, useEffect } from "react";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LabelBadge } from "./LabelBadge";
import { Tag, X, Plus } from "lucide-react";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelSelectorProps {
  ticketId: string;
  currentLabels: Label[];
}

export function LabelSelector({ ticketId, currentLabels }: LabelSelectorProps) {
  const [labels, setLabels] = useState<Label[]>(currentLabels);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [search, setSearch] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    fetch("/api/labels")
      .then((r) => r.json())
      .then((res: { data?: Label[] } | Label[]) => {
        const arr = Array.isArray(res) ? res : (res.data ?? []);
        setAllLabels(arr);
      })
      .catch(() => notify.error("Failed to load labels"));
  }, []);

  const selectedIds = new Set(labels.map((l) => l.id));

  async function syncLabels(next: Label[]) {
    setIsPending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/labels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelIds: next.map((l) => l.id) }),
      });
      if (!res.ok) throw new Error();
      setLabels(next);
    } catch {
      notify.error("Failed to update labels");
    } finally {
      setIsPending(false);
    }
  }

  function toggleLabel(label: Label) {
    const next = selectedIds.has(label.id)
      ? labels.filter((l) => l.id !== label.id)
      : [...labels, label];
    void syncLabels(next);
  }

  function removeLabel(id: string) {
    void syncLabels(labels.filter((l) => l.id !== id));
  }

  const filtered = allLabels.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map((label) => (
        <span key={label.id} className="flex items-center gap-0.5">
          <LabelBadge label={label} />
          <button
            type="button"
            aria-label={`Remove label ${label.name}`}
            className="rounded-full p-0.5 hover:bg-muted transition-colors"
            onClick={() => removeLabel(label.id)}
            disabled={isPending}
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </span>
      ))}

      <Popover>
        <PopoverTrigger
          render={<Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1" aria-label="Add label" />}
        >
          <Tag className="h-3 w-3" />
          <Plus className="h-3 w-3" />
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <Input
            placeholder="Search labels…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs mb-2"
            aria-label="Search labels"
          />
          <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No labels found
              </p>
            )}
            {filtered.map((label) => {
              const selected = selectedIds.has(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition-colors hover:bg-muted ${
                    selected ? "bg-muted/60" : ""
                  }`}
                  aria-pressed={selected}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 truncate">{label.name}</span>
                  {selected && (
                    <span className="text-[11px] text-muted-foreground">added</span>
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
