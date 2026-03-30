// SPEC: labels.md
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LabelChip } from "./LabelChip";
import { notify } from "@/lib/toast";
import { Plus, Check, Tag } from "lucide-react";

interface LabelItem {
  id: string;
  name: string;
  color: string;
}

interface LabelPickerProps {
  ticketId: string;
  currentLabels: LabelItem[];
  /** Pass true for ADMIN role to show "Create new label" option */
  isAdmin?: boolean;
}

const DEFAULT_COLOR = "#6b7280";

export function LabelPicker({
  ticketId,
  currentLabels,
  isAdmin = false,
}: LabelPickerProps) {
  const [labels, setLabels] = useState<LabelItem[]>(currentLabels);
  const [allLabels, setAllLabels] = useState<LabelItem[]>([]);
  const [search, setSearch] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);

  // Inline create state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [createPending, setCreatePending] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/labels")
      .then((r) => r.json())
      .then((res: { data?: LabelItem[] } | LabelItem[]) => {
        const arr = Array.isArray(res) ? res : (res.data ?? []);
        setAllLabels(arr);
      })
      .catch(() => notify.error("Failed to load labels"));
  }, []);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
      setCreating(false);
    }
  }, [open]);

  const selectedIds = new Set(labels.map((l) => l.id));

  async function syncLabels(next: LabelItem[]) {
    const prev = labels;
    setLabels(next); // optimistic
    setIsPending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/labels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelIds: next.map((l) => l.id) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLabels(prev); // revert on failure
      notify.error("Failed to update labels");
    } finally {
      setIsPending(false);
    }
  }

  function toggleLabel(label: LabelItem) {
    const next = selectedIds.has(label.id)
      ? labels.filter((l) => l.id !== label.id)
      : [...labels, label];
    void syncLabels(next);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreatePending(true);
    try {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        notify.error(json.error ?? "Failed to create label");
        return;
      }
      const created = (await res.json()) as LabelItem;
      setAllLabels((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      // Immediately add the new label to the ticket
      void syncLabels([...labels, created]);
      setCreating(false);
      setNewName("");
      setNewColor(DEFAULT_COLOR);
      notify.success(`Label "${created.name}" created and added`);
    } catch {
      notify.error("Failed to create label");
    } finally {
      setCreatePending(false);
    }
  }

  const filtered = allLabels.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map((label) => (
        <LabelChip
          key={label.id}
          label={label}
          onRemove={isPending ? undefined : () => syncLabels(labels.filter((l) => l.id !== label.id))}
        />
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px] gap-1"
              aria-label="Add label"
            />
          }
        >
          <Tag className="h-3 w-3" />
          <span>Add label</span>
        </PopoverTrigger>

        <PopoverContent className="w-60 p-2" align="start">
          {!creating ? (
            <>
              <Input
                ref={searchRef}
                placeholder="Search labels…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs mb-2"
                aria-label="Search labels"
              />
              <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto">
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
                      disabled={isPending}
                      aria-pressed={selected}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors hover:bg-muted ${
                        selected ? "bg-muted/60" : ""
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 truncate">{label.name}</span>
                      {selected && (
                        <Check className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAdmin && (
                <>
                  <div className="border-t my-1.5" />
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-xs w-full text-left hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <Plus className="h-3 w-3 shrink-0" />
                    Create new label
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium">New label</p>
              <Input
                placeholder="Label name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-7 text-xs"
                aria-label="New label name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-6 w-8 rounded border cursor-pointer p-0"
                  aria-label="Label color"
                />
                <Input
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-6 w-24 text-xs font-mono"
                  aria-label="Hex color code"
                  placeholder="#6b7280"
                />
              </div>
              <div className="flex gap-1.5 pt-1">
                <Button
                  size="sm"
                  className="h-6 text-xs flex-1"
                  onClick={() => void handleCreate()}
                  disabled={createPending || !newName.trim()}
                >
                  {createPending ? "Creating…" : "Create & add"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => setCreating(false)}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
