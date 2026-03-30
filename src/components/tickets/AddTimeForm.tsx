// SPEC: tickets.md
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TimeLogEntryData } from "./TimeLogEntry";

interface AddTimeFormProps {
  ticketId: string;
  onSuccess: (newEntry: TimeLogEntryData) => void;
  onCancel: () => void;
}

export function AddTimeForm({ ticketId, onSuccess, onCancel }: AddTimeFormProps) {
  const [hours, setHours] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // autoFocus handled via the input's autoFocus prop
  const hoursInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours < 0.25 || parsedHours > 24) {
      setError("Hours must be between 0.25 and 24.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/time-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours: parsedHours,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Failed to log time");
      }

      const json = (await res.json()) as { data: TimeLogEntryData };
      onSuccess(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log time.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-md border bg-muted/30 p-3 space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="time-log-hours" className="text-xs">
            Hours <span className="text-muted-foreground">(min 0.25)</span>
          </Label>
          <Input
            id="time-log-hours"
            ref={hoursInputRef}
            autoFocus
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 1.5"
            className="h-8 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="time-log-note" className="text-xs">
            Note <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="time-log-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you work on?"
            className="h-8 text-sm"
            maxLength={1000}
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="h-7 text-xs"
        >
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
