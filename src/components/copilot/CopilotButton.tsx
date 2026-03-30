// SPEC: ai-copilot.md
"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopilotButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function CopilotButton({ onClick, isOpen }: CopilotButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={isOpen ? "Close AI Copilot" : "Open AI Copilot"}
      aria-expanded={isOpen}
      className={cn(
        "flex items-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        isOpen && "bg-sidebar-accent text-sidebar-foreground"
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      <span>Copilot</span>
    </Button>
  );
}
