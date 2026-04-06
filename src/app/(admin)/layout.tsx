// SPEC: auth.md
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { AdminSubNav } from "@/components/admin/AdminSubNav";
import { isTeamLead } from "@/lib/role-helpers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role !== UserRole.ADMIN && !isTeamLead(role)) redirect("/");

  const cookieStore = await cookies();
  const adminViewMode = (cookieStore.get("adminViewMode")?.value ?? "craft") as "craft" | "stakeholder";

  return (
    <AppShell user={session.user} adminViewMode={adminViewMode}>
      <div className="flex flex-col h-full">
        <AdminSubNav role={role} />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </AppShell>
  );
}
