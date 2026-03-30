// SPEC: users.md
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";

export const metadata = { title: "Account Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Fetch fresh data from the DB so the form reflects the current state,
  // not a potentially stale JWT token.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, team: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile and credentials.
        </p>
      </div>
      <AccountSettingsForm user={user} />
    </div>
  );
}
