// SPEC: auth.md
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== UserRole.ADMIN) redirect("/");

  return (
    <AppShell user={session.user}>
      {children}
    </AppShell>
  );
}
