// SPEC: brief-to-epic-workflow.md
// Phase 1 — Stakeholder comment review panel (auth-gated)
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2, MessageSquare } from "lucide-react";
import { notify } from "@/lib/toast";

interface ShareTokenRef {
  id: string;
  label: string | null;
}

interface ResolvedBy {
  id: string;
  name: string;
}

interface BriefComment {
  id: string;
  authorName: string;
  authorEmail: string | null;
  body: string;
  resolved: boolean;
  createdAt: string;
  shareToken: ShareTokenRef | null;
  resolvedBy: ResolvedBy | null;
}

interface BriefCommentsProps {
  briefId: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── CommentCard ─────────────────────────────────────────────────────────────────

interface CommentCardProps {
  comment: BriefComment;
  briefId: string;
  onResolved: (commentId: string) => void;
}

function CommentCard({ comment, briefId, onResolved }: CommentCardProps) {
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    setLoading(true);
    const res = await fetch(`/api/briefs/${briefId}/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    });
    setLoading(false);
    if (!res.ok) {
      notify.error("Failed to resolve comment");
      return;
    }
    onResolved(comment.id);
  }

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        comment.resolved ? "opacity-60 bg-muted/30" : "bg-background"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{comment.authorName}</span>
            {comment.authorEmail && (
              <span className="text-xs text-muted-foreground">
                {comment.authorEmail}
              </span>
            )}
            {comment.shareToken && (
              <span className="text-xs text-muted-foreground">
                via{" "}
                <span className="font-medium">
                  {comment.shareToken.label ?? "Unnamed link"}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(comment.createdAt)}
          </p>
        </div>

        <div className="shrink-0">
          {comment.resolved ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolved
              {comment.resolvedBy && (
                <span className="text-muted-foreground">
                  {" "}by {comment.resolvedBy.name}
                </span>
              )}
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResolve}
              disabled={loading}
              className="text-xs h-7"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Circle className="h-3.5 w-3.5 mr-1" />
              )}
              Resolve
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-foreground whitespace-pre-wrap">{comment.body}</p>
    </div>
  );
}

// ── BriefComments ───────────────────────────────────────────────────────────────

export function BriefComments({ briefId }: BriefCommentsProps) {
  const [comments, setComments] = useState<BriefComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/briefs/${briefId}/comments`);
      if (!res.ok) {
        setError("Failed to load comments");
        return;
      }
      const json = (await res.json()) as { data: BriefComment[] };
      setComments(json.data);
    } catch {
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [briefId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  function handleResolved(commentId: string) {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, resolved: true } : c))
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center space-y-2">
        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No stakeholder comments yet. Share this brief to collect feedback.
        </p>
      </div>
    );
  }

  // Group by share token label
  const grouped: Record<string, BriefComment[]> = {};
  for (const c of comments) {
    const key = c.shareToken?.label ?? c.shareToken?.id ?? "direct";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  const unresolved = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  return (
    <div className="space-y-6">
      {/* Summary line */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {unresolved.length} unresolved · {resolved.length} resolved
        </span>
      </div>

      {/* Grouped by token */}
      {Object.entries(grouped).map(([groupKey, groupComments]) => {
        const tokenLabel =
          groupComments[0]?.shareToken?.label ?? "Unnamed link";
        return (
          <div key={groupKey} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {groupKey === "direct" ? "Direct" : tokenLabel}
            </p>
            {groupComments.map((c) => (
              <CommentCard
                key={c.id}
                comment={c}
                briefId={briefId}
                onResolved={handleResolved}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Export unresolved count utility for use in tab badge
export function countUnresolved(comments: BriefComment[]): number {
  return comments.filter((c) => !c.resolved).length;
}
