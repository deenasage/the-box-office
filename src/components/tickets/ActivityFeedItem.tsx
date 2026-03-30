// SPEC: tickets.md
"use client";

import { formatDistanceToNow } from "date-fns";
import { STATUS_LABELS } from "@/lib/constants";
import { getInitials } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-muted-foreground",
  TODO: "bg-sky-500",
  IN_PROGRESS: "bg-violet-500",
  IN_REVIEW: "bg-amber-500",
  BLOCKED: "bg-orange-600",
  DONE: "bg-[#008146]",
};

export type FeedItem =
  | {
      kind: "status";
      id: string;
      timestamp: string;
      toStatus: string;
      fromStatus: string | null;
      changedBy: { id: string; name: string };
    }
  | {
      kind: "comment";
      id: string;
      timestamp: string;
      body: string;
      author: { id: string; name: string };
    };

interface ActivityFeedItemProps {
  item: FeedItem;
}

export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
  const relativeTime = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });

  if (item.kind === "status") {
    const dotColor = STATUS_COLORS[item.toStatus] ?? "bg-muted-foreground";
    const label = STATUS_LABELS[item.toStatus] ?? item.toStatus;
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
        <span>
          <span className="font-medium text-foreground">{item.changedBy.name}</span>
          {" moved to "}
          <span className="font-medium text-foreground">{label}</span>
        </span>
        <span className="ml-auto text-xs whitespace-nowrap">{relativeTime}</span>
      </div>
    );
  }

  // comment
  const preview =
    item.body.length > 100 ? item.body.slice(0, 100) + "…" : item.body;
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
        {getInitials(item.author.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{item.author.name}</span>
          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">{relativeTime}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 wrap-break-word">{preview}</p>
      </div>
    </div>
  );
}
