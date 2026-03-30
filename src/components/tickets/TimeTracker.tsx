// SPEC: tickets.md
"use client";

import { useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/hooks/useFetch";
import { TimeLogEntry } from "./TimeLogEntry";
import type { TimeLogEntryData } from "./TimeLogEntry";
import { AddTimeForm } from "./AddTimeForm";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimeTrackerProps {
  ticketId: string;
  currentUserId: string;
  currentUserRole: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHours(h: number): string {
  return `${parseFloat(h.toFixed(1))}h`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TimeTracker({ ticketId, currentUserId, currentUserRole }: TimeTrackerProps) {
  const {
    data: logsResponse,
    loading: isLoading,
    error: fetchError,
    refetch,
  } = useFetch<{ data: TimeLogEntryData[] }>(`/api/tickets/${ticketId}/time-logs`);

  const [logs, setLogs] = useState<TimeLogEntryData[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync fetched logs into local state so mutations (optimistic add/remove) can override them
  const resolvedLogs: TimeLogEntryData[] = logs ?? logsResponse?.data ?? [];
  const totalHours = resolvedLogs.reduce((sum, log) => sum + log.hours, 0);

  function handleToggleForm() {
    setShowForm((prev) => !prev);
    setDeleteError(null);
  }

  function handleAddSuccess(newEntry: TimeLogEntryData) {
    // Prepend — API returns ordered by loggedAt desc, so new entry goes first
    setLogs((prev) => [newEntry, ...(prev ?? logsResponse?.data ?? [])]);
    setShowForm(false);
  }

  function handleUpdated(updated: TimeLogEntryData) {
    setLogs((prev) =>
      (prev ?? logsResponse?.data ?? []).map((l) =>
        l.id === updated.id ? updated : l
      )
    );
  }

  async function handleDelete(logId: string) {
    setDeletingId(logId);
    // Optimistic removal
    setLogs((prev) => (prev ?? logsResponse?.data ?? []).filter((l) => l.id !== logId));

    try {
      const res = await fetch(`/api/tickets/${ticketId}/time-logs/${logId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete log");
    } catch {
      setDeleteError("Failed to delete time log.");
      // Roll back by re-fetching
      setLogs(null);
      refetch();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Time Logged</h3>
          {!isLoading && resolvedLogs.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {formatHours(totalHours)} logged
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleForm}
          className="h-7 gap-1 px-2 text-xs"
          aria-label={showForm ? "Cancel log time" : "Log time"}
        >
          {showForm ? (
            <>
              <X className="h-3 w-3" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              Log Time
            </>
          )}
        </Button>
      </div>

      {/* Inline add-time form */}
      {showForm && (
        <AddTimeForm
          ticketId={ticketId}
          onSuccess={handleAddSuccess}
          onCancel={handleToggleForm}
        />
      )}

      {/* Delete error (outside form) */}
      {!showForm && (deleteError ?? fetchError) && (
        <p className="text-xs text-destructive">{deleteError ?? fetchError}</p>
      )}

      {/* Loading / empty states */}
      {isLoading && (
        <p className="text-xs text-muted-foreground">Loading…</p>
      )}

      {!isLoading && resolvedLogs.length === 0 && (
        <p className="text-xs text-muted-foreground">No time logged yet.</p>
      )}

      {/* Log list */}
      {resolvedLogs.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {resolvedLogs.map((log) => (
            <TimeLogEntry
              key={log.id}
              log={log}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              isDeleting={deletingId === log.id}
              onDelete={(id) => void handleDelete(id)}
              onUpdated={handleUpdated}
              formatHours={formatHours}
            />
          ))}
        </div>
      )}
    </div>
  );
}
