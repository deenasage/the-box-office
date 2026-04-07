// SPEC: tickets.md
"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityFeedItem, type FeedItem } from "./ActivityFeedItem";

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
  changedBy: { id: string; name: string };
}

interface AuditLogEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: { id: string; name: string };
}

interface ActivityFeedProps {
  ticketId: string;
  refreshKey?: number;
}

export function ActivityFeed({ ticketId, refreshKey }: ActivityFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const [historyRes, auditRes] = await Promise.all([
        fetch(`/api/tickets/${ticketId}/status-history`),
        fetch(`/api/tickets/${ticketId}/audit-log`),
      ]);

      if (!historyRes.ok) throw new Error("Failed to load activity");

      const historyJson = (await historyRes.json()) as { data: StatusHistoryEntry[] };
      const auditJson = auditRes.ok
        ? ((await auditRes.json()) as { data: AuditLogEntry[] })
        : { data: [] };

      const statusItems: FeedItem[] = historyJson.data.map((h) => ({
        kind: "status",
        id: h.id,
        timestamp: h.changedAt,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedBy: h.changedBy,
      }));

      // Every audit entry is its own immutable row — posted, edited, deleted
      // are all separate entries, nothing overwrites anything.
      const fieldItems: FeedItem[] = auditJson.data.map((a) => ({
        kind: "field",
        id: a.id,
        timestamp: a.changedAt,
        field: a.field,
        oldValue: a.oldValue,
        newValue: a.newValue,
        changedBy: a.changedBy,
      }));

      const merged = [...statusItems, ...fieldItems].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setItems(merged);
    } catch {
      setError("Could not load activity.");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed, refreshKey]);

  return (
    <div className="space-y-3">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      )}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <ActivityFeedItem key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
