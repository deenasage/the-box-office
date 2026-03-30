// SPEC: copilot.md
"use client";

import { Bot } from "lucide-react";

interface StreamingBubbleProps {
  content: string;
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
  return (
    <div className="px-4 py-1.5 flex items-start gap-2">
      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="bg-card border rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[calc(100%-2.5rem)]">
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {content}
          <span className="inline-block w-0.5 h-3.5 bg-foreground ml-0.5 animate-pulse align-middle" />
        </p>
      </div>
    </div>
  );
}
