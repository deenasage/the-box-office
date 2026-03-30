// SPEC: sprint-scrum.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityType } from "@prisma/client";

interface DeletionLogEntry {
  id: string;
  entityType: EntityType;
  entityTitle: string;
  deletedBy: { name: string };
  createdAt: string;
  ticketCount: number;
  restoredAt: string | null;
  restoredBy: { name: string } | null;
}

interface DeletionLogTableProps {
  initialLogs: DeletionLogEntry[];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DeletionLogTable({ initialLogs }: DeletionLogTableProps) {
  const [logs, setLogs] = useState<DeletionLogEntry[]>(initialLogs);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleRestore(logId: string) {
    setRestoringId(logId);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[logId];
      return next;
    });

    try {
      const res = await fetch(`/api/admin/deletion-log/${logId}/restore`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `Request failed (${res.status})`
        );
      }

      // Mark the entry as restored in local state
      const now = new Date().toISOString();
      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? { ...log, restoredAt: now, restoredBy: { name: "You" } }
            : log
        )
      );
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [logId]: err instanceof Error ? err.message : "Restore failed",
      }));
    } finally {
      setRestoringId(null);
    }
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No deletion history yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-left font-medium">Title</th>
            <th className="px-4 py-3 text-left font-medium">Deleted By</th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Deleted At</th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Tickets Affected</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const isRestored = log.restoredAt !== null;
            const isRestoring = restoringId === log.id;
            const rowError = errors[log.id];

            return (
              <tr
                key={log.id}
                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs font-mono">
                    {log.entityType}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium max-w-xs truncate">
                  {log.entityTitle}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {log.deletedBy.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDateTime(log.createdAt)}
                </td>
                <td className="px-4 py-3 text-center">
                  {log.entityType === EntityType.SPRINT && log.ticketCount > 0 ? (
                    <span className="text-muted-foreground">{log.ticketCount}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isRestored ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                      Restored
                      {log.restoredBy && (
                        <span className="text-muted-foreground font-normal">
                          by {log.restoredBy.name}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-destructive font-medium">Deleted</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isRestored || isRestoring}
                      onClick={() => handleRestore(log.id)}
                    >
                      {isRestoring ? "Restoring…" : "Restore"}
                    </Button>
                    {rowError && (
                      <p className="text-xs text-destructive text-right max-w-[160px]">
                        {rowError}
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
