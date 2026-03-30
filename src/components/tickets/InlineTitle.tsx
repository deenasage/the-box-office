// SPEC: tickets.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

interface InlineTitleProps {
  ticketId: string;
  initial: string;
}

export function InlineTitle({ ticketId, initial }: InlineTitleProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initial) {
      setValue(initial);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      router.refresh();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") void commit();
    if (e.key === "Escape") { setValue(initial); setEditing(false); }
  }

  const MAX_LENGTH = 200;

  if (editing) {
    return (
      <div className="relative">
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={handleKeyDown}
          disabled={saving}
          maxLength={MAX_LENGTH}
          className="text-2xl font-semibold tracking-tight h-auto py-1 px-2 tracking-tight"
          aria-label="Edit ticket title"
        />
        {value.length >= 160 && (
          <span className={`absolute right-2 bottom-1 text-[11px] ${value.length >= MAX_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
            {value.length}/{MAX_LENGTH}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-start gap-2 text-left w-full rounded-md px-1 -mx-1 hover:bg-muted/50 transition-colors"
      aria-label="Click to edit title"
    >
      <h1 className="text-2xl font-semibold tracking-tight flex-1">{value}</h1>
      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
    </button>
  );
}
