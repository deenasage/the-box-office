// SPEC: ai-copilot.md
// SPEC: design-improvements.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/SidebarNav";
import { CopilotButton } from "@/components/copilot/CopilotButton";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { ViewAsDropdown } from "@/components/admin/ViewAsDropdown";
import { UserRole, Team } from "@prisma/client";

interface AppShellUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: Team | null;
}

interface AppShellProps {
  user: AppShellUser;
  children: React.ReactNode;
  adminViewMode?: "craft" | "stakeholder";
  viewAsUserId?: string | null;
  viewAsUser?: AppShellUser | null;
}

export function AppShell({
  user,
  children,
  adminViewMode = "craft",
  viewAsUserId = null,
  viewAsUser = null,
}: AppShellProps) {
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  // When impersonating, the sidebar reflects the target user's role/nav
  const sidebarUser = viewAsUser ?? user;
  const isImpersonating = !!viewAsUserId && !!viewAsUser;

  return (
    <div className="flex min-h-screen">
      {/* WCAG 2.4.1 — Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-9999 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      <SidebarNav user={sidebarUser} adminViewMode={adminViewMode} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex justify-end items-center gap-1 px-4 py-2 border-b border-border bg-background shrink-0">
          {/* View As — admin only */}
          {user.role === UserRole.ADMIN && (
            <ViewAsDropdown
              currentUserId={user.id}
              viewAsUserId={viewAsUserId}
              viewAsUser={viewAsUser}
            />
          )}

          <GlobalSearch />

          <NotificationBell />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="h-8 w-8"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <CopilotButton
            onClick={() => setIsCopilotOpen((v) => !v)}
            isOpen={isCopilotOpen}
          />
        </div>

        {/* Impersonation banner */}
        {isImpersonating && viewAsUser && (
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 animate-fade-in">
            <span className="font-medium">Viewing as {viewAsUser.name}</span>
            <span className="opacity-60">—</span>
            <span className="opacity-75">{viewAsUser.role.replace(/_/g, " ")}</span>
            {viewAsUser.team && (
              <>
                <span className="opacity-60">·</span>
                <span className="opacity-75">{viewAsUser.team}</span>
              </>
            )}
          </div>
        )}

        <main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
          {children}
        </main>
      </div>

      <CopilotPanel
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </div>
  );
}
