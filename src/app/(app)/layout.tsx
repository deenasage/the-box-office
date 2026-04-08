// SPEC: auth.md, ai-copilot.md
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const adminViewMode = (cookieStore.get("adminViewMode")?.value ?? "craft") as "craft" | "stakeholder";

  // View-as: only admins can impersonate; resolve the effective user from DB
  let viewAsUserId: string | null = null;
  let viewAsUser: { id: string; name: string; email: string; role: UserRole; team: import("@prisma/client").Team | null } | null = null;

  if (session.user.role === UserRole.ADMIN) {
    const raw = cookieStore.get("viewAsUserId")?.value ?? null;
    if (raw) {
      const found = await db.user.findUnique({
        where: { id: raw },
        select: { id: true, name: true, email: true, role: true, team: true },
      });
      // Refuse to impersonate another admin
      if (found && found.role !== UserRole.ADMIN) {
        viewAsUserId = found.id;
        viewAsUser = found;
      }
    }
  }

  return (
    <>
      <KeyboardShortcuts />
      <AppShell
        user={session.user}
        adminViewMode={adminViewMode}
        viewAsUserId={viewAsUserId}
        viewAsUser={viewAsUser}
      >
        {children}
      </AppShell>
    </>
  );
}
