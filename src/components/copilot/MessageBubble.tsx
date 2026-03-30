// SPEC: copilot.md
"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "./CopyButton";

export interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "USER";
  const isReport = !isUser && message.content.includes("#");

  return (
    <div className={cn("px-4 py-1.5", isUser && "flex justify-end")}>
      {isUser ? (
        <div className="bg-muted rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="bg-card border rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-full">
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
            </div>
            {isReport && <CopyButton content={message.content} />}
          </div>
        </div>
      )}
    </div>
  );
}
