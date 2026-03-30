// SPEC: ai-copilot.md
"use client";

import { useState, useCallback, useEffect } from "react";
import { readSSEStream } from "@/lib/sse";
import type { Message } from "@/components/copilot/MessageBubble";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "copilot_session_id";

// ---------------------------------------------------------------------------
// Return type (exported for documentation)
// ---------------------------------------------------------------------------

export interface UseCopilotSessionReturn {
  sessionId: string | null;
  messages: Message[];
  streamingContent: string;
  isGenerating: boolean;
  errorMsg: string | null;
  sendMessage: (content: string) => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  startNewSession: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCopilotSession(): UseCopilotSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    fetch(`/api/copilot/sessions/${stored}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data: { id: string; messages: Message[] }) => {
        setSessionId(data.id);
        setMessages(data.messages ?? []);
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
      });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isGenerating) return;

      setErrorMsg(null);

      // Optimistically add user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "USER",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsGenerating(true);
      setStreamingContent("");

      try {
        // Create session on first message
        let sid = sessionId;
        if (!sid) {
          const res = await fetch("/api/copilot/sessions", { method: "POST" });
          if (!res.ok) throw new Error("Failed to create session");
          const data: { id: string } = await res.json();
          sid = data.id;
          setSessionId(sid);
          localStorage.setItem(STORAGE_KEY, sid);
        }

        // Send message and consume SSE stream
        const response = await fetch(
          `/api/copilot/sessions/${sid}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: trimmed }),
          }
        );

        if (!response.ok) throw new Error("API error");
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        let assembled = "";
        let promptTokens = 0;
        let outputTokens = 0;

        for await (const { event, data } of readSSEStream(reader)) {
          try {
            const parsed = JSON.parse(data) as {
              text?: string;
              promptTokens?: number;
              outputTokens?: number;
              message?: string;
            };
            if (event === "delta" && parsed.text) {
              assembled += parsed.text;
              setStreamingContent(assembled);
            } else if (event === "done") {
              promptTokens = parsed.promptTokens ?? 0;
              outputTokens = parsed.outputTokens ?? 0;
            } else if (event === "error") {
              throw new Error(parsed.message ?? "Stream error");
            }
          } catch (parseErr) {
            if (event === "error") throw parseErr;
            // ignore JSON parse failures on non-error events
          }
        }

        // Save the completed assistant message
        const saveRes = await fetch(
          `/api/copilot/sessions/${sid}/messages/save`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: assembled,
              promptTokens,
              outputTokens,
            }),
          }
        );

        if (saveRes.ok) {
          const saved: Message = await saveRes.json();
          setMessages((prev) => [...prev, saved]);
        } else {
          // Save failed — still show the message from stream
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "ASSISTANT",
              content: assembled,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } catch {
        setErrorMsg("Sorry, I couldn't process that. Please try again.");
      } finally {
        setStreamingContent("");
        setIsGenerating(false);
      }
    },
    [sessionId, isGenerating]
  );

  const loadSession = useCallback(async (id: string) => {
    const data: { id: string; messages: Message[] } = await fetch(
      `/api/copilot/sessions/${id}`
    ).then((r) => r.json());
    setSessionId(data.id);
    setMessages(data.messages ?? []);
    localStorage.setItem(STORAGE_KEY, data.id);
  }, []);

  const startNewSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setStreamingContent("");
    setIsGenerating(false);
    setErrorMsg(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    sessionId,
    messages,
    streamingContent,
    isGenerating,
    errorMsg,
    sendMessage,
    loadSession,
    startNewSession,
  };
}
