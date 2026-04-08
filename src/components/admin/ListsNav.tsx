// SPEC: lists-admin.md
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "teams", label: "Teams" },
  { key: "skillsets", label: "Skillsets" },
  { key: "labels", label: "Labels" },
  { key: "tiers", label: "Tiers" },
  { key: "categories", label: "Categories" },
  { key: "regions", label: "Regions" },
  { key: "statuses", label: "Statuses" },
  { key: "priorities", label: "Priorities" },
] as const;

interface ListsNavProps {
  activeTab: string;
}

export function ListsNav({ activeTab }: ListsNavProps) {
  return (
    <nav
      className="flex flex-wrap gap-1"
      aria-label="Lists sections"
    >
      {TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={`/admin/lists?tab=${key}`}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            activeTab === key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          aria-current={activeTab === key ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
