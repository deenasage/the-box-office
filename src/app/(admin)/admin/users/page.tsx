// SPEC: design-improvements.md
// SPEC: users.md
// SPEC: skillsets.md
import { db } from "@/lib/db";
import { UserRole, Team } from "@prisma/client";
import { UsersTable } from "@/components/users/UsersTable";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      team: true,
      skillsets: {
        select: {
          skillset: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  const mapped = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    team: u.team,
    skillsets: u.skillsets.map((us) => us.skillset),
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team member names, roles, and team assignments.
          </p>
        </div>
      </div>

      <UsersTable
        initialUsers={mapped as Array<{ id: string; name: string; email: string; role: UserRole; team: Team | null; skillsets?: { id: string; name: string; color: string }[] }>}
      />
    </div>
  );
}
