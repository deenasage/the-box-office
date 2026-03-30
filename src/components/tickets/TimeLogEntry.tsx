// SPEC: tickets.md
"use client";

import { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface TimeLogUser {
  id: string;
  name: string;
}

export interface TimeLogEntryData {
  id: string;
  ticketId: string;
  userId: string;
  hours: number;
  note: string | null;
  loggedAt: string;
  user: TimeLogUser;
}

interface TimeLogEntryProps {
  log: TimeLogEntryData;
  currentUserId: string;
  currentUserRole: string;
  isDeleting: boolean;
  onDelete: (logId: string) => void;
  onUpdated?: (updated: TimeLogEntryData) => void;
  formatHours: (h: number) => string;
}

export function TimeLogEntry({
  log,
  currentUserId,
  currentUserRole,
  isDeleting,
  onDelete,
  onUpdated,
  formatHours,
}: TimeLogEntryProps) {
  const canAct = log.userId === currentUserId || currentUserRole === "ADMIN";

  const [isEditing, setIsEditing] = useState(false);
  const [hours, setHours] = useState(String(log.hours));
  const [note, setNote] = useState(log.note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const hoursRef = useRef<HTMLInputElement>(null);

  function handleEditClick() {
    setHours(String(log.hours));
    setNote(log.note ?? "");
    setEditError(null);
    setIsEditing(true);
    setTimeout(() => hoursRef.current?.focus(), 0);
  }

  function handleCancel() {
    setIsEditing(false);
    setEditError(null);
  }

  async function handleSave() {
    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours < 0.25 || parsedHours > 24) {
      setEditError("Hours must be between 0.25 and 24.");
      return;
    }

    const trimmedNote = note.trim() || null;
    const unchanged =
      parsedHours === log.hours && trimmedNote === log.note;
    if (unchanged) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/tickets/${log.ticketId}/time-logs/${log.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hours: parsedHours, note: trimmedNote }),
        }
      );

      const json = (await res.json()) as {
        data?: TimeLogEntryData;
        error?: string;
      };

      if (!res.ok) {
        setEditError(json.error ?? "Failed to update time log.");
        return;
      }

      onUpdated?.(json.data!);
      setIsEditing(false);
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-sm border bg-muted/30 px-2 py-2 text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label htmlFor={`tl-hours-${log.id}`} className="text-muted-foreground">
              Hours
            </label>
            <Input
              id={`tl-hours-${log.id}`}
              ref={hoursRef}
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`tl-note-${log.id}`} className="text-muted-foreground">
              Note
            </label>
            <Input
              id={`tl-note-${log.id}`}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-7 text-xs"
              maxLength={1000}
              placeholder="optional"
            />
          </div>
        </div>
        {editError && (
          <p className="text-destructive" role="alert">
            {editError}
          </p>
        )}
        <div className="flex justify-end gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted/50 group">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium">{log.user.name}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono text-xs font-semibold">
            {formatHours(log.hours)}
          </span>
          {log.note && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="truncate text-muted-foreground">
                {log.note}
              </span>
            </>
          )}
        </div>
        <div className="text-muted-foreground/70">
          {formatDistanceToNow(new Date(log.loggedAt), { addSuffix: true })}
        </div>
      </div>

      {canAct && (
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleEditClick}
            disabled={isDeleting}
            aria-label="Edit time log"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(log.id)}
            disabled={isDeleting}
            aria-label="Delete time log"
            className="rounded p-0.5 text-muted-foreground hover:text-destructive"
            style={{ opacity: isDeleting ? 0.4 : undefined }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
