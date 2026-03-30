// SPEC: design-improvements.md
// SPEC: search.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FlatResult } from "@/hooks/useCommandSearch";
import { STATUS_LABELS } from "@/lib/constants";

interface CommandResultGroupProps {
  title: string;
  icon: React.ReactNode;
  items: FlatResult[];
  flatItems: FlatResult[];
  activeIndex: number;
  onSelect: (href: string) => void;
}

export function CommandResultGroup({
  title,
  icon,
  items,
  flatItems,
  activeIndex,
  onSelect,
}: CommandResultGroupProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      {items.map((item) => {
        const globalIndex = flatItems.findIndex(
          (f) => f.id === item.id && f.kind === item.kind
        );
        const isActive = globalIndex === activeIndex;
        return (
          <button
            key={item.id}
            role="option"
            aria-selected={isActive}
            onClick={() => onSelect(item.href)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
              isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
          >
            <span className="flex-1 truncate">{item.label}</span>
            <Badge variant="outline" className="shrink-0 text-[11px]">
              {STATUS_LABELS[item.status] ?? item.status}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
