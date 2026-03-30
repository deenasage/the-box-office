// SPEC: auth.md
// SPEC: design-improvements.md
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { signOut } from "next-auth/react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Zap, Map, Settings,
  LogOut, FileText, BarChart3, Users, Briefcase,
  UserCheck, GitBranch, Layers, History, Upload,
  Kanban,
} from "lucide-react";
import { UserRole, Team } from "@prisma/client";

interface NavUser {
  name: string;
  email: string;
  role: UserRole;
  team: Team | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  matchPrefixes?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-work", label: "My Work", icon: UserCheck },
  { href: "/tickets", label: "Tickets", icon: Kanban },
  {
    href: "/submit-request",
    label: "Submit Request",
    icon: FileText,
    matchPrefixes: ["/submit-request", "/briefs"],
  },
  { href: "/sprints", label: "Sprints", icon: Zap },
  { href: "/portfolio", label: "Projects", icon: Briefcase },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  {
    href: "/reports",
    label: "Data & Reports",
    icon: BarChart3,
    matchPrefixes: ["/reports", "/analytics", "/time-tracking"],
  },
  { href: "/capacity", label: "Capacity", icon: Users },
];

const ADMIN_ITEMS = [
  { href: "/admin/forms", label: "Form Builder", icon: Settings },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/routing-rules", label: "Routing Rules", icon: GitBranch },
  { href: "/admin/lists", label: "Lists", icon: Layers },
  { href: "/admin/deletion-log", label: "Deletion Log", icon: History },
  { href: "/admin/import", label: "Import", icon: Upload },
];

export function SidebarNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [activeSprint, setActiveSprint] = useState<{ name: string; pct: number } | null>(null);

  useEffect(() => {
    fetch("/api/sprints")
      .then((r) => r.json())
      .then((res: { data: { isActive: boolean; name: string; ticketCount: number; doneCount: number }[] }) => {
        const sprints = res.data ?? [];
        const active = sprints.find((s) => s.isActive);
        if (!active) return;
        const total = active.ticketCount ?? 0;
        const done = active.doneCount ?? 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        setActiveSprint({ name: active.name, pct });
      })
      .catch(() => {});
  }, []);

  // Longest-match wins: prevents parent paths like /tickets from staying highlighted
  // when a more specific child like /tickets/dependencies is also registered.
  // Items with matchPrefixes also activate when the current path matches any of those prefixes.
  const activeNavHref = NAV_ITEMS
    .filter((item) => {
      const h = item.href;
      const directMatch = pathname === h || (h !== "/" && pathname.startsWith(h + "/"));
      const prefixMatch = item.matchPrefixes?.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      ) ?? false;
      return directMatch || prefixMatch;
    })
    .map((item) => item.href)
    .sort((a, b) => b.length - a.length)[0] ?? null;

  return (
    <aside className="w-56 flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      <div className="px-4 py-4 border-b border-sidebar-border flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          {/* Ticket stub logo */}
          <svg width="18" height="12" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {/* Ticket body with notched short edges */}
            <path
              d="M2.5 0H19.5Q22 0 22 2.5V5A2 2 0 0 1 22 9V11.5Q22 14 19.5 14H2.5Q0 14 0 11.5V9A2 2 0 0 1 0 5V2.5Q0 0 2.5 0Z"
              fill="white"
            />
            {/* Stub divider — dashed line */}
            <line x1="7" y1="0.5" x2="7" y2="13.5" stroke="rgba(0,129,70,0.35)" strokeWidth="0.9" strokeDasharray="2 1.5" strokeLinecap="round"/>
            {/* Star in main section */}
            <path
              d="M14.5 4l.9 1.8 2 .28-1.45 1.41.34 2-1.79-.94-1.79.94.34-2L11.6 6.08l2-.28L14.5 4z"
              fill="rgba(0,129,70,0.7)"
            />
          </svg>
        </div>
        <h1 className="font-semibold text-sm text-sidebar-foreground">The Box Office</h1>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors hover:no-underline",
              href === activeNavHref
                ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
                : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        {(user.role === UserRole.ADMIN || user.role === UserRole.TEAM_LEAD) && (
          <>
            <div className="pt-3 pb-1 px-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/80">
                Admin
              </p>
            </div>
            {ADMIN_ITEMS.filter(({ href }) =>
              user.role === UserRole.ADMIN ||
              href === "/admin/forms"
            ).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors hover:no-underline",
                  pathname.startsWith(href)
                    ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}

        {activeSprint && (
          <div className="mx-2.5 mt-3 pt-3 border-t border-sidebar-border space-y-1.5">
            <div className="flex justify-between text-[11px] text-sidebar-foreground/85">
              <span className="truncate">{activeSprint.name}</span>
              <span>{activeSprint.pct}%</span>
            </div>
            <div
              className="w-full bg-sidebar-accent rounded-full h-1"
              role="progressbar"
              aria-valuenow={activeSprint.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Sprint progress"
            >
              <div
                className="bg-sidebar-primary h-1 rounded-full transition-all"
                style={{ width: `${activeSprint.pct}%` }}
              />
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 flex items-center gap-2.5">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-foreground">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate text-sidebar-foreground">{user.name}</p>
          <p className="text-[11px] text-sidebar-foreground/85 truncate">{user.role}</p>
        </div>
        <Link
          href="/settings"
          title="Account settings"
          aria-label="Account settings"
          className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-sidebar-foreground/85 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:no-underline transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          title="Sign out"
          aria-label="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-sidebar-foreground/85 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
