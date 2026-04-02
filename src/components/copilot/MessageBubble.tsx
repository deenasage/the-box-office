// SPEC: copilot.md
"use client";

import ReactMarkdown from "react-markdown";
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
  const content = message.content ?? "";
  const isReport = !isUser && content.includes("#");

  return (
    <div className={cn("px-4 py-1.5", isUser && "flex justify-end")}>
      {isUser ? (
        <div className="bg-muted rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="bg-card border rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-full">
              <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none
                prose-headings:font-semibold prose-headings:text-foreground
                prose-h3:text-base prose-h3:mt-3 prose-h3:mb-1
                prose-h4:text-sm prose-h4:mt-2 prose-h4:mb-0.5
                prose-p:my-1 prose-p:text-foreground
                prose-strong:text-foreground prose-strong:font-semibold
                prose-ul:my-1 prose-ul:pl-4
                prose-li:my-0.5
                prose-blockquote:border-l-2 prose-blockquote:border-yellow-400 prose-blockquote:pl-3 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:my-2
                prose-hr:border-border prose-hr:my-3
              ">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
            {isReport && <CopyButton content={content} />}
          </div>
        </div>
      )}
    </div>
  );
}
