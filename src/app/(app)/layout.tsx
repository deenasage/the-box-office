// SPEC: auth.md, ai-copilot.md
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <>
      <KeyboardShortcuts />
      <AppShell user={session.user}>
        {children}
      </AppShell>
    </>
  );
}
