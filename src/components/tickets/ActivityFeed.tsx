// SPEC: tickets.md
"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityFeedItem, type FeedItem } from "./ActivityFeedItem";
import type { CommentData } from "./CommentItem";

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
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
    try {
      const [historyRes, commentsRes] = await Promise.all([
        fetch(`/api/tickets/${ticketId}/status-history`),
        fetch(`/api/tickets/${ticketId}/comments`),
      ]);

      if (!historyRes.ok || !commentsRes.ok) {
        throw new Error("Failed to load activity");
      }

      const historyJson = (await historyRes.json()) as { data: StatusHistoryEntry[] };
      const commentsJson = (await commentsRes.json()) as { data: CommentData[] };

      const statusItems: FeedItem[] = historyJson.data.map((h) => ({
        kind: "status",
        id: h.id,
        timestamp: h.changedAt,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedBy: h.changedBy,
      }));

      const commentItems: FeedItem[] = commentsJson.data.map((c) => ({
        kind: "comment",
        id: c.id,
        timestamp: c.createdAt,
        body: c.body,
        author: c.author,
      }));

      const merged = [...statusItems, ...commentItems].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
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
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Activity</h3>

      {isLoading && <p className="text-sm text-muted-foreground">Loading activity…</p>}
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
