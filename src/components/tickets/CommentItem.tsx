// SPEC: tickets.md
"use client";

import { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface CommentData {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  author: { id: string; name: string };
}

interface CommentItemProps {
  comment: CommentData;
  ticketId: string;
  currentUserId: string;
  onDelete: (commentId: string) => void;
  isDeleting: boolean;
  onUpdated?: (updated: CommentData) => void;
}

function renderBody(text: string): React.ReactNode {
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-primary font-medium bg-primary/10 rounded px-0.5">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CommentItem({
  comment,
  ticketId,
  currentUserId,
  onDelete,
  isDeleting,
  onUpdated,
}: CommentItemProps) {
  const isOwn = comment.author.id === currentUserId;

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleEditClick() {
    setEditText(comment.body);
    setEditError(null);
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleCancel() {
    setIsEditing(false);
    setEditError(null);
  }

  async function handleSave() {
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditError("Comment cannot be empty.");
      return;
    }
    if (trimmed === comment.body) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/tickets/${ticketId}/comments/${comment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        }
      );

      const json = (await res.json()) as { data?: CommentData; error?: string };

      if (!res.ok) {
        setEditError(json.error ?? "Failed to update comment.");
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

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
        {getInitials(comment.author.name)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.author.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
          {isOwn && !isEditing && (
            <div className="ml-auto flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={handleEditClick}
                disabled={isDeleting}
                aria-label="Edit comment"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(comment.id)}
                disabled={isDeleting}
                aria-label="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1.5 space-y-2">
            <Textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="text-sm min-h-[72px] resize-y"
              aria-label="Edit comment body"
            />
            {editError && (
              <p className="text-xs text-destructive" role="alert">
                {editError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground mt-0.5 break-words">{renderBody(comment.body)}</p>
        )}
      </div>
    </div>
  );
}
