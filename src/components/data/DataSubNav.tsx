// SPEC: data-section.md
// SPEC: design-improvements.md
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/reports", label: "Reports" },
  { href: "/analytics", label: "Analytics" },
  { href: "/time-tracking", label: "Time Tracking" },
];

export function DataSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 border-b border-border mb-6"
      aria-label="Data sections"
    >
      {TABS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            pathname === href || pathname.startsWith(href + "/")
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
          aria-current={
            pathname === href || pathname.startsWith(href + "/")
              ? "page"
              : undefined
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
