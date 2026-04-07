// SPEC: tickets.md
"use client";

import { formatDistanceToNow } from "date-fns";
import { STATUS_LABELS } from "@/lib/constants";
import { getInitials } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  BACKLOG:     "bg-slate-400",
  TODO:        "bg-blue-400",
  READY:       "bg-sky-400",
  IN_PROGRESS: "bg-violet-500",
  IN_REVIEW:   "bg-purple-500",
  BLOCKED:     "bg-red-500",
  DONE:        "bg-green-500",
};

const FIELD_LABELS: Record<string, string> = {
  title:            "Title",
  description:      "Description",
  team:             "Team",
  priority:         "Priority",
  size:             "Size",
  assigneeId:       "Assignee",
  sprintId:         "Sprint",
  comment_added:    "comment",
  comment_edited:   "comment",
  comment_deleted:  "comment",
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
    }
  | {
      kind: "field";
      id: string;
      timestamp: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
      changedBy: { id: string; name: string };
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

  if (item.kind === "field") {
    const truncate = (s: string | null, len = 60) =>
      s && s.length > len ? s.slice(0, len) + "…" : s;

    if (item.field === "comment_added") {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full shrink-0 bg-border" />
          <span className="flex-1 min-w-0">
            <span className="font-medium text-foreground">{item.changedBy.name}</span>
            {" added a comment"}
            {item.newValue && (
              <span className="text-foreground/60"> — {truncate(item.newValue)}</span>
            )}
          </span>
          <span className="ml-auto text-xs whitespace-nowrap shrink-0">{relativeTime}</span>
        </div>
      );
    }

    if (item.field === "comment_deleted") {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full shrink-0 bg-border" />
          <span className="flex-1 min-w-0">
            <span className="font-medium text-foreground">{item.changedBy.name}</span>
            {" deleted a comment"}
          </span>
          <span className="ml-auto text-xs whitespace-nowrap shrink-0">{relativeTime}</span>
        </div>
      );
    }

    if (item.field === "comment_edited") {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full shrink-0 bg-border" />
          <span className="flex-1 min-w-0">
            <span className="font-medium text-foreground">{item.changedBy.name}</span>
            {" edited a comment"}
            {item.newValue && (
              <span className="text-foreground/60"> — {truncate(item.newValue)}</span>
            )}
          </span>
          <span className="ml-auto text-xs whitespace-nowrap shrink-0">{relativeTime}</span>
        </div>
      );
    }

    const fieldLabel = FIELD_LABELS[item.field] ?? item.field;
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full shrink-0 bg-border" />
        <span className="flex-1 min-w-0">
          <span className="font-medium text-foreground">{item.changedBy.name}</span>
          {" updated "}
          <span className="font-medium text-foreground">{fieldLabel}</span>
          {item.oldValue && item.newValue && (
            <> from <span className="text-foreground/70">{item.oldValue}</span> to <span className="text-foreground/70">{item.newValue}</span></>
          )}
          {!item.oldValue && item.newValue && (
            <> set to <span className="text-foreground/70">{item.newValue}</span></>
          )}
          {item.oldValue && !item.newValue && (
            <> cleared</>
          )}
        </span>
        <span className="ml-auto text-xs whitespace-nowrap shrink-0">{relativeTime}</span>
      </div>
    );
  }

  // comment
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
        <p className="text-sm text-muted-foreground mt-0.5 wrap-break-word whitespace-pre-wrap">{item.body}</p>
      </div>
    </div>
  );
}
