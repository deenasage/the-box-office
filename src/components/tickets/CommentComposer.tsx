// SPEC: tickets.md
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface CommentComposerProps {
  onPost: (body: string) => Promise<void>;
  isPosting: boolean;
}

export function CommentComposer({ onPost, isPosting }: CommentComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handlePost() {
    const trimmed = value.trim();
    if (!trimmed) return;
    await onPost(trimmed);
    setValue("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      void handlePost();
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment… (Ctrl+Enter to post)"
        rows={3}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handlePost}
          disabled={isPosting || !value.trim()}
        >
          {isPosting ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
}
