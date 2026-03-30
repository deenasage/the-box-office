// SPEC: tickets.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

interface InlineDescriptionProps {
  ticketId: string;
  initial: string | null;
}

export function InlineDescription({ ticketId, initial }: InlineDescriptionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      router.refresh();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void commit();
    if (e.key === "Escape") { setValue(initial ?? ""); setEditing(false); }
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <Textarea
          ref={textareaRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={handleKeyDown}
          disabled={saving}
          rows={5}
          placeholder="Add a description..."
          aria-label="Edit ticket description"
        />
        <p className="text-xs text-muted-foreground">Cmd+Enter to save, Esc to cancel</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-start gap-2 text-left w-full rounded-md px-1 -mx-1 hover:bg-muted/50 transition-colors"
      aria-label="Click to edit description"
    >
      {value ? (
        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed flex-1">{value}</p>
      ) : (
        <p className="text-muted-foreground/80 italic flex-1">Add a description...</p>
      )}
      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
    </button>
  );
}
