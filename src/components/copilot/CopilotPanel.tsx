// SPEC: ai-copilot.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Bot, X, History, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCopilotSession } from "@/hooks/useCopilotSession";
import { CopilotHistoryDrawer } from "./CopilotHistoryDrawer";
import { TypingIndicator } from "./TypingIndicator";
import { MessageBubble } from "./MessageBubble";
import { StreamingBubble } from "./StreamingBubble";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  "What's at risk this sprint?",
  "Summarize the active sprint",
  "Show unassigned design tickets",
  "List initiatives on hold",
] as const;

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function CopilotPanel({ isOpen, onClose }: CopilotPanelProps) {
  const {
    sessionId,
    messages,
    streamingContent,
    isGenerating,
    errorMsg,
    sendMessage,
    loadSession,
    startNewSession,
  } = useCopilotSession();

  // Pure UI state
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Auto-resize textarea
  function handleTextareaInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  function handleSend(content: string) {
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    sendMessage(content);
  }

  function startNewChat() {
    startNewSession();
    setShowHistory(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleSelectSession(id: string) {
    setShowHistory(false);
    loadSession(id).catch(() => {});
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        role="complementary"
        aria-label="AI Copilot"
        className={cn(
          "fixed top-0 right-0 h-full z-50 flex flex-col",
          "w-full sm:w-[400px]",
          "bg-background border-l shadow-xl",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* History drawer overlay */}
        {showHistory && (
          <CopilotHistoryDrawer
            sessionId={sessionId}
            onSelectSession={handleSelectSession}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <span className="flex-1 text-sm font-semibold">AI Copilot</span>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowHistory((v) => !v)}
            aria-label="Session history"
            title="History"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={startNewChat}
            aria-label="New chat"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close copilot"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Message list */}
        <div
          className="flex-1 overflow-y-auto py-2"
          aria-live="polite"
          aria-atomic="false"
        >
          {!hasMessages && !isGenerating && (
            <div className="px-4 py-6 flex flex-col gap-4">
              <div className="text-center">
                <Bot className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Ask anything about your team&apos;s work
                </p>
              </div>
              {/* Suggested prompt chips */}
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="text-left text-xs px-3 py-2.5 rounded-lg border bg-card hover:bg-muted transition-colors leading-snug"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isGenerating && streamingContent === "" && <TypingIndicator />}
          {isGenerating && streamingContent !== "" && (
            <StreamingBubble content={streamingContent} />
          )}

          {errorMsg && (
            <div className="px-4 py-2">
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2.5 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">!</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t px-3 py-3 shrink-0">
          <div className="flex items-end gap-2 rounded-xl border bg-muted/30 px-3 py-2 focus-within:ring-2 focus-within:ring-ring/50">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your work..."
              rows={1}
              disabled={isGenerating}
              aria-label="Message input"
              className={cn(
                "flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60",
                "min-h-[1.5rem] max-h-40 leading-6",
                isGenerating && "opacity-50 cursor-not-allowed"
              )}
            />
            <Button
              size="icon-sm"
              onClick={() => handleSend(input)}
              disabled={isGenerating || input.trim() === ""}
              aria-label="Send message"
              className="shrink-0 mb-0.5"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/80 text-center mt-1.5">
            Enter to send &middot; Shift+Enter for newline
          </p>
        </div>
      </aside>
    </>
  );
}
