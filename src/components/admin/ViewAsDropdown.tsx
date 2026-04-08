"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRole, Team } from "@prisma/client";
import { Users, ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/role-helpers";

interface ViewAsUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: Team | null;
}

interface ViewAsDropdownProps {
  currentUserId: string;
  viewAsUserId: string | null;
  viewAsUser: ViewAsUser | null;
}

const ROLE_ORDER: UserRole[] = [
  UserRole.ADMIN,
  UserRole.TEAM_LEAD_CRAFT,
  UserRole.TEAM_LEAD_STAKEHOLDER,
  UserRole.MEMBER_CRAFT,
  UserRole.MEMBER_STAKEHOLDER,
];

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: "text-purple-600 dark:text-purple-400",
  TEAM_LEAD_CRAFT: "text-blue-600 dark:text-blue-400",
  TEAM_LEAD_STAKEHOLDER: "text-sky-600 dark:text-sky-400",
  MEMBER_CRAFT: "text-green-700 dark:text-green-400",
  MEMBER_STAKEHOLDER: "text-orange-600 dark:text-orange-400",
};

export function ViewAsDropdown({ currentUserId, viewAsUserId, viewAsUser }: ViewAsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ViewAsUser[]>([]);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isImpersonating = !!viewAsUserId;

  // Fetch users on first open
  useEffect(() => {
    if (!open || users.length > 0) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: ViewAsUser[]) => {
        // Exclude the admin's own account and other admins
        setUsers(data.filter((u) => u.id !== currentUserId && u.role !== UserRole.ADMIN));
      })
      .catch(() => {});
  }, [open, users.length, currentUserId]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function selectUser(userId: string | null) {
    setOpen(false);
    setQuery("");
    startTransition(async () => {
      await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      router.refresh();
    });
  }

  // Group + filter users
  const filtered = users.filter(
    (u) =>
      !query ||
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = ROLE_ORDER.filter((r) => r !== UserRole.ADMIN).map((role) => ({
    role,
    users: filtered.filter((u) => u.role === role),
  })).filter((g) => g.users.length > 0);

  return (
    <div ref={dropdownRef} className="relative">
      {isImpersonating && viewAsUser ? (
        /* Active impersonation pill */
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium",
              "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30",
              "hover:bg-amber-500/20 transition-colors duration-150"
            )}
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{viewAsUser.name}</span>
            <span className="opacity-60">·</span>
            <span className="opacity-75">{ROLE_LABELS[viewAsUser.role]}</span>
            <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
          </button>
          <button
            type="button"
            title="Exit view-as mode"
            onClick={() => selectUser(null)}
            disabled={pending}
            className="h-8 w-8 flex items-center justify-center rounded-md text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors duration-150"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* Idle button */
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium",
            "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
          )}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>View as</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-border bg-popover shadow-lg animate-fade-in">
          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search users…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* User list */}
          <div className="max-h-72 overflow-y-auto py-1.5">
            {grouped.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No users found.</p>
            )}

            {grouped.map(({ role, users: roleUsers }) => (
              <div key={role}>
                <p className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {ROLE_LABELS[role]}
                </p>
                {roleUsers.map((u) => {
                  const isActive = u.id === viewAsUserId;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectUser(isActive ? null : u.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors duration-100",
                        isActive
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{u.name}</p>
                        <p className={cn("text-[11px] truncate", ROLE_COLORS[u.role])}>
                          {u.team ? `${u.team} · ` : ""}{ROLE_LABELS[u.role]}
                        </p>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Exit at bottom when impersonating */}
          {isImpersonating && (
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                onClick={() => selectUser(null)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors duration-100"
              >
                <X className="h-3.5 w-3.5" />
                Exit view-as mode
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
