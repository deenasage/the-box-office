// SPEC: auth.md
// SPEC: design-improvements.md
"use client";

import Link from "next/link";
import { isTeamLead } from "@/lib/role-helpers";
import { usePathname } from "next/navigation";
import { type ComponentType } from "react";
import { signOut } from "next-auth/react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Zap, Map, Settings,
  LogOut, FileText, BarChart3, Users, Briefcase,
  User, Kanban,
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
  { href: "/my-work", label: "My Work", icon: User },
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

export function SidebarNav({
  user,
}: {
  user: NavUser;
  adminViewMode?: "craft" | "stakeholder";
}) {
  const pathname = usePathname();

  const isAdminArea = pathname.startsWith("/admin");

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

  const canAccessAdmin = user.role === UserRole.ADMIN || isTeamLead(user.role);

  return (
    <aside className="w-56 flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <svg width="18" height="12" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M2.5 0H19.5Q22 0 22 2.5V5A2 2 0 0 1 22 9V11.5Q22 14 19.5 14H2.5Q0 14 0 11.5V9A2 2 0 0 1 0 5V2.5Q0 0 2.5 0Z"
              fill="white"
            />
            <line x1="7" y1="0.5" x2="7" y2="13.5" stroke="rgba(0,129,70,0.35)" strokeWidth="0.9" strokeDasharray="2 1.5" strokeLinecap="round"/>
            <path
              d="M14.5 4l.9 1.8 2 .28-1.45 1.41.34 2-1.79-.94-1.79.94.34-2L11.6 6.08l2-.28L14.5 4z"
              fill="rgba(0,129,70,0.7)"
            />
          </svg>
        </div>
        <h1 className="font-semibold text-sm text-sidebar-foreground">The Box Office</h1>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors hover:no-underline",
              href === activeNavHref
                ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-2 space-y-0.5">
        {/* Single Admin link — for privileged users */}
        {canAccessAdmin && (
          <Link
            href="/admin/users"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors hover:no-underline",
              isAdminArea
                ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Admin
          </Link>
        )}
      </div>

      {/* User row */}
      <div className="border-t border-sidebar-border px-3 py-3 flex items-center gap-2.5">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-foreground">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate text-sidebar-foreground">{user.name}</p>
          <p className="text-[11px] text-sidebar-foreground/50 truncate">{user.email}</p>
        </div>
        <button
          type="button"
          title="Sign out"
          aria-label="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
