// SPEC: capacity-planning.md
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserRole, Team } from "@prisma/client";
import { CapacityPageClient } from "@/components/capacity/CapacityPageClient";

export default async function CapacityPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Resolve effective user role + team (respects "View as" cookie for admins)
  let effectiveRole: UserRole = session.user.role;
  let effectiveTeam: Team | null = session.user.team ?? null;

  if (session.user.role === UserRole.ADMIN) {
    const cookieStore = await cookies();
    const viewAsId = cookieStore.get("viewAsUserId")?.value ?? null;
    if (viewAsId) {
      const viewAsUser = await db.user.findUnique({
        where: { id: viewAsId },
        select: { role: true, team: true },
      });
      if (viewAsUser && viewAsUser.role !== UserRole.ADMIN) {
        effectiveRole = viewAsUser.role;
        effectiveTeam = viewAsUser.team;
      }
    }
  }

  // Team leads and members only see their own team
  const teamFilter =
    (effectiveRole === UserRole.TEAM_LEAD_CRAFT || effectiveRole === UserRole.MEMBER_CRAFT)
      ? effectiveTeam
      : null;

  return <CapacityPageClient teamFilter={teamFilter} />;
}
