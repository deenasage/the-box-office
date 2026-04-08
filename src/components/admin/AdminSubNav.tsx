"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserRole } from "@prisma/client";
import {
  Settings, Users, GitBranch, Layers,
  History, Upload, Tag, MapPin, Wrench,
  SlidersHorizontal, LayoutGrid,
} from "lucide-react";

interface SubNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const ITEMS: SubNavItem[] = [
  { href: "/admin/users",         label: "Users",         icon: Users },
  { href: "/admin/forms",         label: "Forms",         icon: Settings },
  { href: "/admin/routing-rules", label: "Routing",       icon: GitBranch },
  { href: "/admin/lists",         label: "Lists",         icon: Layers,    adminOnly: true },
  { href: "/admin/labels",        label: "Labels",        icon: Tag,       adminOnly: true },
  { href: "/admin/skillsets",     label: "Skillsets",     icon: Wrench,    adminOnly: true },
  { href: "/admin/milestones",    label: "Milestones",    icon: MapPin,    adminOnly: true },
  { href: "/admin/custom-fields",  label: "Custom Fields",  icon: SlidersHorizontal, adminOnly: true },
  { href: "/admin/board-settings", label: "Board Settings", icon: LayoutGrid,        adminOnly: true },
  { href: "/admin/deletion-log",   label: "Deletion Log",   icon: History,           adminOnly: true },
  { href: "/admin/import",         label: "Import",         icon: Upload,            adminOnly: true },
];

export function AdminSubNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const isAdmin = role === UserRole.ADMIN;

  const visible = ITEMS.filter((i) => !i.adminOnly || isAdmin);

  return (
    <div className="border-b border-border bg-muted/30">
      <div style={{ display: "flex", width: "100%", justifyContent: "space-evenly" }}>
        {visible.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-sm whitespace-nowrap border-b-2 transition-colors hover:no-underline",
                active
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
