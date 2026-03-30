// SPEC: tickets.md
"use client";

import { useCallback, useEffect, useState } from "react";
import { CommentItem, type CommentData } from "./CommentItem";
import { CommentComposer } from "./CommentComposer";

interface TicketCommentsProps {
  ticketId: string;
  currentUserId: string;
  currentUserName: string;
  onCommentAdded?: () => void;
}

export function TicketComments({ ticketId, currentUserId, currentUserName, onCommentAdded }: TicketCommentsProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`);
      if (!res.ok) throw new Error("Failed to load comments");
      const json = (await res.json()) as { data: CommentData[] };
      setComments(json.data);
    } catch {
      setError("Could not load comments.");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  async function handlePost(body: string) {
    setIsPosting(true);
    // Optimistic insert
    const optimistic: CommentData = {
      id: `optimistic-${Date.now()}`,
      body,
      createdAt: new Date().toISOString(),
      authorId: currentUserId,
      author: { id: currentUserId, name: currentUserName },
    };
    setComments((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      const json = (await res.json()) as { data: CommentData };
      // Replace optimistic entry with real one
      setComments((prev) => prev.map((c) => (c.id === optimistic.id ? json.data : c)));
      onCommentAdded?.();
    } catch {
      // Roll back optimistic entry
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setError("Failed to post comment.");
    } finally {
      setIsPosting(false);
    }
  }

  function handleUpdated(updated: CommentData) {
    setComments((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    // Optimistic removal
    setComments((prev) => prev.filter((c) => c.id !== commentId));

    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete comment");
    } catch {
      // Roll back: re-fetch to restore correct state
      setError("Failed to delete comment.");
      void fetchComments();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Comments</h3>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!isLoading && comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}

      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              ticketId={ticketId}
              currentUserId={currentUserId}
              onDelete={handleDelete}
              isDeleting={deletingId === comment.id}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      <CommentComposer onPost={handlePost} isPosting={isPosting} />
    </div>
  );
}
