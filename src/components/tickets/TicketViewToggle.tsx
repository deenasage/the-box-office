// SPEC: tickets.md
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export function TicketViewToggle() {
  const pathname = usePathname();
  const isBoard = pathname === "/tickets";

  return (
    <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-muted/30">
      <Link
        href="/tickets"
        aria-label="Board view"
        className={cn(
          "flex items-center justify-center h-7 w-7 rounded-md transition-colors",
          isBoard
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </Link>
      <Link
        href="/tickets/list"
        aria-label="List view"
        className={cn(
          "flex items-center justify-center h-7 w-7 rounded-md transition-colors",
          !isBoard
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <List className="h-4 w-4" />
      </Link>
    </div>
  );
}
