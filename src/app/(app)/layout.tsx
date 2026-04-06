// SPEC: auth.md, ai-copilot.md
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const adminViewMode = (cookieStore.get("adminViewMode")?.value ?? "craft") as "craft" | "stakeholder";

  return (
    <>
      <KeyboardShortcuts />
      <AppShell user={session.user} adminViewMode={adminViewMode}>
        {children}
      </AppShell>
    </>
  );
}
