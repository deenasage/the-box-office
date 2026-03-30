// SPEC: ai-copilot.md
"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

interface SessionListItem {
  id: string;
  createdAt: string;
  preview: string;
}

interface CopilotHistoryDrawerProps {
  sessionId: string | null;
  onSelectSession: (id: string) => void;
  onClose: () => void;
}

export function CopilotHistoryDrawer({
  sessionId,
  onSelectSession,
  onClose,
}: CopilotHistoryDrawerProps) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/copilot/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      const data: SessionListItem[] = await res.json();
      setSessions(data);
    } catch {
      setError("Could not load session history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/copilot/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silently ignore delete failures — list stays intact
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="absolute inset-0 bg-background z-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Back to chat"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">Chat History</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="px-4 py-6 text-sm text-destructive text-center">{error}</div>
        )}

        {!isLoading && !error && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No previous sessions</p>
          </div>
        )}

        {!isLoading && !error && sessions.length > 0 && (
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelectSession(s.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors",
                    sessionId === s.id && "bg-muted"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-foreground leading-snug">
                      {s.preview || "New conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => handleDelete(s.id, e)}
                    disabled={deletingId === s.id}
                    aria-label="Delete session"
                    className="shrink-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
